"""
Parakeet Transcription Server for CallDoc.

A FastAPI service that transcribes audio files using NVIDIA Parakeet-TDT 0.6B V2.
Falls back to mock transcription mode when NeMo toolkit is not available (dev/test).

Endpoints:
  POST /transcribe       - Synchronous transcription (multipart file upload)
  POST /jobs             - Async transcription job submission
  GET  /jobs/{job_id}    - Job status and results
  GET  /health           - Health check
"""

from __future__ import annotations

import asyncio
import logging
import os
import random
import tempfile
import time
import uuid
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Optional

import aiohttp
from fastapi import FastAPI, File, HTTPException, Query, UploadFile
from pydantic import BaseModel

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("transcription")

# ---------------------------------------------------------------------------
# NeMo / Parakeet import (optional)
# ---------------------------------------------------------------------------
NEMO_AVAILABLE = False
asr_model = None

try:
    import nemo.collections.asr as nemo_asr  # type: ignore[import-untyped]

    NEMO_AVAILABLE = True
    logger.info("NeMo toolkit detected - Parakeet model will be loaded on first request")
except ImportError:
    logger.warning(
        "NeMo toolkit not installed - running in MOCK transcription mode. "
        "Install nemo_toolkit[asr] for real transcription."
    )

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
TRANSCRIPTION_MODE = os.getenv("TRANSCRIPTION_MODE", "mock")  # "mock" or "nemo"
CALLBACK_BASE_URL = os.getenv("CALLBACK_BASE_URL", "http://app:3000")
MODEL_NAME = "nvidia/parakeet-tdt-0.6b-v2"

# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------


class JobStatus(str, Enum):
    pending = "pending"
    processing = "processing"
    completed = "completed"
    failed = "failed"


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    confidence: float


class Segment(BaseModel):
    start: float
    end: float
    text: str
    confidence: float
    words: list[WordTimestamp]


class TranscriptionResult(BaseModel):
    recording_id: str | None = None
    job_id: str | None = None
    status: str = "completed"
    transcript: str
    confidence: float
    duration_seconds: float
    language: str = "en"
    segments: list[Segment]
    processing_time_seconds: float


class JobCreateRequest(BaseModel):
    recording_id: str
    audio_url: str
    callback_url: str | None = None
    language: str = "en"


class JobInfo(BaseModel):
    job_id: str
    recording_id: str
    status: JobStatus
    progress: float = 0.0
    created_at: str
    completed_at: str | None = None
    error: str | None = None
    result: TranscriptionResult | None = None


# ---------------------------------------------------------------------------
# In-memory job store
# ---------------------------------------------------------------------------
jobs: dict[str, JobInfo] = {}

# ---------------------------------------------------------------------------
# FastAPI app
# ---------------------------------------------------------------------------
app = FastAPI(
    title="CallDoc Transcription Server",
    description="Audio transcription service using NVIDIA Parakeet-TDT 0.6B V2",
    version="1.0.0",
)


# ---------------------------------------------------------------------------
# Mock transcription data
# ---------------------------------------------------------------------------
MOCK_CONVERSATIONS: list[list[str]] = [
    [
        "Thank you for calling Acme Support, my name is Sarah. How can I help you today?",
        "Hi Sarah, I'm having trouble with my account login. It keeps saying invalid password.",
        "I'm sorry to hear that. Let me pull up your account. Can I have your account number or email address?",
        "Sure, it's john dot smith at email dot com.",
        "Thank you, I can see your account here. It looks like your account was locked after three failed attempts.",
        "Oh, that makes sense. I was trying different passwords.",
        "No worries, it happens all the time. I've unlocked your account and sent a password reset link to your email.",
        "Great, I just got it. Let me try logging in now.",
        "Take your time.",
        "It worked! Thank you so much for your help, Sarah.",
        "You're welcome! Is there anything else I can help you with today?",
        "No, that's all. Have a great day!",
        "You too! Thank you for calling Acme Support. Goodbye.",
    ],
    [
        "Good afternoon, this is Mike with billing support. How may I assist you?",
        "Hi, I received a charge on my statement that I don't recognize. It's for forty-nine ninety-nine.",
        "I'd be happy to look into that for you. May I have your customer ID?",
        "It's C H seven four two one.",
        "Thank you. I can see the charge you're referring to. That's for the premium plan upgrade that was processed on January fifteenth.",
        "I didn't authorize any upgrade. I've been on the basic plan.",
        "I understand your concern. Let me check the activity log on your account.",
        "Please do.",
        "It appears the upgrade was triggered through the mobile app. Is it possible someone with access to your account made this change?",
        "Oh wait, my husband might have done that. Let me check with him.",
        "Of course, take your time.",
        "Yes, he confirmed he upgraded it. I'm sorry for the confusion.",
        "Not a problem at all! Would you like to keep the premium plan or revert to basic?",
        "We'll keep it actually. Thank you for your patience, Mike.",
        "Absolutely! Glad we could sort that out. Have a wonderful day!",
    ],
    [
        "Hello, you've reached technical support. This is Jennifer. What seems to be the issue?",
        "My internet has been really slow for the past two days. I'm barely getting five megabits.",
        "I'm sorry about that. Let me run some diagnostics on your line. Can I get your service address?",
        "It's four twenty-one Oak Street, apartment B.",
        "Thank you. I'm seeing some signal issues on your line. There was maintenance in your area yesterday that may have affected your connection.",
        "So is it something on your end?",
        "It appears so. I'm going to reset your connection from here and that should resolve the speed issue.",
        "Okay, how long will that take?",
        "Just about two minutes. Your modem will restart automatically. You'll see the lights flash and then come back solid.",
        "Alright, I see it restarting now.",
        "Perfect. Once all the lights are solid green, try running a speed test.",
        "It's back up and I'm getting ninety-five megabits now. That's much better!",
        "Excellent! That's right where it should be. I'll make a note on your account about this issue.",
        "Thank you so much, Jennifer. You've been very helpful.",
        "Happy to help! If you experience any more issues, don't hesitate to call back. Have a great evening!",
    ],
    [
        "Thank you for calling reservations, this is David speaking.",
        "Hi, I'd like to make a reservation for this Saturday.",
        "Of course! How many guests will be dining with us?",
        "There will be four of us.",
        "And what time would you prefer?",
        "Seven thirty if possible.",
        "Let me check availability. We do have a table for four at seven thirty. Would you like indoor or patio seating?",
        "Indoor, please. Do you have anything near the window?",
        "I can put you at a window table. It has a lovely view of the garden.",
        "That sounds perfect. The reservation will be under Thompson.",
        "Wonderful, Mr. Thompson. Table for four, Saturday at seven thirty, window seating. Any dietary restrictions or special occasions I should note?",
        "Actually, it's my wife's birthday. Could you arrange a small cake?",
        "Absolutely! We'd be happy to. We have chocolate, vanilla, or red velvet. Any preference?",
        "Chocolate would be great.",
        "Perfect. I've noted everything. We'll have a complimentary birthday dessert ready. See you Saturday, Mr. Thompson!",
        "Thank you, David. We're looking forward to it!",
    ],
    [
        "Claims department, this is Rachel. How can I help?",
        "I need to file a claim. I had a fender bender this morning.",
        "I'm sorry to hear that. Are you okay? Was anyone injured?",
        "Everyone is fine, thankfully. Just some damage to the bumper.",
        "Good to hear everyone's safe. I'll help you get this claim started. Can I have your policy number?",
        "It's P O L dash eight eight three two one seven.",
        "Thank you. I have your policy pulled up. Can you walk me through what happened?",
        "I was stopped at a red light on Main Street and the car behind me didn't stop in time.",
        "Understood. Did you get the other driver's information?",
        "Yes, I have their insurance details and we both took photos.",
        "Perfect, that's exactly what we need. I'm going to assign you a claim number. It's C L M dash two zero two five dash zero four seven.",
        "Got it, thank you.",
        "An adjuster will contact you within twenty-four hours to schedule an inspection. In the meantime, you're welcome to get a repair estimate from any of our approved shops.",
        "Is Smith Auto Body on the approved list?",
        "Let me check. Yes, they are! They're one of our preferred partners actually.",
        "Great, I'll take it there. Thanks for your help, Rachel.",
        "You're welcome. I'm sorry about the accident, but we'll get you taken care of. Stay safe!",
    ],
]


def _generate_mock_transcript(duration_hint: float = 0.0) -> TranscriptionResult:
    """Generate a realistic mock transcription result."""
    conversation = random.choice(MOCK_CONVERSATIONS)

    # Decide how many lines to use (at least 4, up to full conversation)
    num_lines = random.randint(4, len(conversation))
    lines = conversation[:num_lines]

    segments: list[Segment] = []
    current_time = 0.0

    for line in lines:
        words_raw = line.split()
        word_timestamps: list[WordTimestamp] = []
        segment_start = current_time

        for w in words_raw:
            word_duration = random.uniform(0.15, 0.45)
            gap = random.uniform(0.02, 0.10)
            word_start = current_time
            word_end = current_time + word_duration
            word_conf = random.uniform(0.85, 0.99)

            word_timestamps.append(
                WordTimestamp(
                    word=w,
                    start=round(word_start, 3),
                    end=round(word_end, 3),
                    confidence=round(word_conf, 4),
                )
            )
            current_time = word_end + gap

        segment_end = current_time
        # Small pause between speakers
        current_time += random.uniform(0.3, 1.2)

        seg_confidence = round(
            sum(wt.confidence for wt in word_timestamps) / len(word_timestamps), 4
        )

        segments.append(
            Segment(
                start=round(segment_start, 3),
                end=round(segment_end, 3),
                text=line,
                confidence=seg_confidence,
                words=word_timestamps,
            )
        )

    full_transcript = " ".join(seg.text for seg in segments)
    total_duration = segments[-1].end if segments else 0.0
    overall_confidence = round(
        sum(seg.confidence for seg in segments) / len(segments), 4
    )

    return TranscriptionResult(
        transcript=full_transcript,
        confidence=overall_confidence,
        duration_seconds=round(total_duration, 3),
        language="en",
        segments=segments,
        processing_time_seconds=0.0,  # Filled in by caller
    )


# ---------------------------------------------------------------------------
# NeMo transcription
# ---------------------------------------------------------------------------


def _load_nemo_model():
    """Lazy-load the Parakeet model on first use."""
    global asr_model
    if asr_model is None and NEMO_AVAILABLE:
        logger.info("Loading Parakeet model: %s", MODEL_NAME)
        import nemo.collections.asr as nemo_asr  # type: ignore[import-untyped]

        asr_model = nemo_asr.models.ASRModel.from_pretrained(model_name=MODEL_NAME)
        logger.info("Parakeet model loaded successfully")
    return asr_model


def _convert_opus_to_wav(input_path: str) -> str:
    """Convert Opus audio to WAV using pydub/ffmpeg."""
    from pydub import AudioSegment

    audio = AudioSegment.from_file(input_path)
    wav_path = input_path.rsplit(".", 1)[0] + ".wav"
    audio = audio.set_frame_rate(16000).set_channels(1)
    audio.export(wav_path, format="wav")
    return wav_path


def _transcribe_with_nemo(audio_path: str) -> TranscriptionResult:
    """Transcribe audio file using the NeMo Parakeet model."""
    model = _load_nemo_model()
    if model is None:
        raise RuntimeError("NeMo model failed to load")

    # Check if we need to convert from Opus
    if audio_path.lower().endswith((".opus", ".ogg", ".webm")):
        logger.info("Converting non-WAV audio to WAV: %s", audio_path)
        audio_path = _convert_opus_to_wav(audio_path)

    # Transcribe with timestamps
    result = model.transcribe(
        [audio_path],
        timestamps=True,
        return_hypotheses=True,
    )

    # Extract hypothesis
    if isinstance(result, list) and len(result) > 0:
        hypothesis = result[0]
        if isinstance(hypothesis, list) and len(hypothesis) > 0:
            hypothesis = hypothesis[0]
    else:
        raise RuntimeError("Empty transcription result from NeMo")

    # Parse word-level timestamps from hypothesis
    transcript_text = ""
    segments: list[Segment] = []
    overall_confidence = 0.0

    if hasattr(hypothesis, "text"):
        transcript_text = hypothesis.text

    # Build segments from word timestamps if available
    if hasattr(hypothesis, "timestep") and hypothesis.timestep is not None:
        words_data = hypothesis.timestep
        if hasattr(words_data, "words") and words_data.words:
            current_segment_words: list[WordTimestamp] = []
            segment_text_parts: list[str] = []
            segment_start = 0.0
            sentence_end_chars = {".", "?", "!"}

            for w_info in words_data.words:
                word_str = w_info.word if hasattr(w_info, "word") else str(w_info)
                w_start = float(w_info.start) if hasattr(w_info, "start") else 0.0
                w_end = float(w_info.end) if hasattr(w_info, "end") else 0.0
                w_conf = (
                    float(w_info.confidence)
                    if hasattr(w_info, "confidence")
                    else 0.9
                )

                if not current_segment_words:
                    segment_start = w_start

                current_segment_words.append(
                    WordTimestamp(
                        word=word_str,
                        start=round(w_start, 3),
                        end=round(w_end, 3),
                        confidence=round(w_conf, 4),
                    )
                )
                segment_text_parts.append(word_str)

                # Split segments at sentence boundaries or after ~15 words
                is_sentence_end = any(
                    word_str.endswith(c) for c in sentence_end_chars
                )
                if is_sentence_end or len(current_segment_words) >= 15:
                    seg_text = " ".join(segment_text_parts)
                    seg_conf = sum(
                        wt.confidence for wt in current_segment_words
                    ) / len(current_segment_words)
                    segments.append(
                        Segment(
                            start=round(segment_start, 3),
                            end=round(w_end, 3),
                            text=seg_text,
                            confidence=round(seg_conf, 4),
                            words=list(current_segment_words),
                        )
                    )
                    current_segment_words = []
                    segment_text_parts = []

            # Remaining words as final segment
            if current_segment_words:
                seg_text = " ".join(segment_text_parts)
                seg_conf = sum(
                    wt.confidence for wt in current_segment_words
                ) / len(current_segment_words)
                segments.append(
                    Segment(
                        start=round(segment_start, 3),
                        end=round(current_segment_words[-1].end, 3),
                        text=seg_text,
                        confidence=round(seg_conf, 4),
                        words=list(current_segment_words),
                    )
                )

    # If no segments were created from timestamps, create a single segment
    if not segments and transcript_text:
        segments.append(
            Segment(
                start=0.0,
                end=0.0,
                text=transcript_text,
                confidence=0.9,
                words=[],
            )
        )

    if segments:
        overall_confidence = round(
            sum(s.confidence for s in segments) / len(segments), 4
        )

    duration = segments[-1].end if segments else 0.0

    return TranscriptionResult(
        transcript=transcript_text,
        confidence=overall_confidence,
        duration_seconds=round(duration, 3),
        language="en",
        segments=segments,
        processing_time_seconds=0.0,
    )


# ---------------------------------------------------------------------------
# Core transcription dispatcher
# ---------------------------------------------------------------------------


async def _transcribe_audio(
    audio_path: str,
    language: str = "en",
    recording_id: str | None = None,
    job_id: str | None = None,
) -> TranscriptionResult:
    """Transcribe an audio file, using NeMo if available, otherwise mock mode."""
    start_time = time.monotonic()

    use_nemo = TRANSCRIPTION_MODE == "nemo" and NEMO_AVAILABLE

    if use_nemo:
        logger.info("Transcribing with NeMo: %s", audio_path)
        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, _transcribe_with_nemo, audio_path)
    else:
        logger.info("Transcribing with MOCK mode: %s", audio_path)
        # Simulate processing delay
        delay = random.uniform(2.0, 5.0)
        await asyncio.sleep(delay)
        result = _generate_mock_transcript()

    elapsed = time.monotonic() - start_time
    result.processing_time_seconds = round(elapsed, 3)
    result.recording_id = recording_id
    result.job_id = job_id
    result.language = language

    return result


# ---------------------------------------------------------------------------
# Async job processor
# ---------------------------------------------------------------------------


async def _process_job(job_id: str) -> None:
    """Background task that processes an async transcription job."""
    job = jobs.get(job_id)
    if job is None:
        return

    job.status = JobStatus.processing
    job.progress = 0.1
    audio_path: str | None = None
    tmp_dir: str | None = None

    try:
        # Download audio from URL
        logger.info("Job %s: downloading audio from %s", job_id, job.result)
        job.progress = 0.2

        # We stored the audio_url in the job's result field temporarily via
        # a workaround -- instead, let's retrieve it from the _job_meta store.
        audio_url = _job_meta[job_id]["audio_url"]
        callback_url = _job_meta[job_id].get("callback_url")
        language = _job_meta[job_id].get("language", "en")

        tmp_dir = tempfile.mkdtemp(prefix="transcription_")

        # Determine file extension from URL
        url_path = audio_url.split("?")[0]
        ext = Path(url_path).suffix or ".wav"
        audio_path = os.path.join(tmp_dir, f"audio{ext}")

        async with aiohttp.ClientSession() as session:
            async with session.get(audio_url) as resp:
                if resp.status != 200:
                    raise RuntimeError(
                        f"Failed to download audio: HTTP {resp.status}"
                    )
                with open(audio_path, "wb") as f:
                    async for chunk in resp.content.iter_chunked(8192):
                        f.write(chunk)

        job.progress = 0.4
        logger.info("Job %s: audio downloaded, starting transcription", job_id)

        # Transcribe
        result = await _transcribe_audio(
            audio_path,
            language=language,
            recording_id=job.recording_id,
            job_id=job_id,
        )

        job.progress = 0.9
        job.result = result
        job.status = JobStatus.completed
        job.completed_at = datetime.now(timezone.utc).isoformat()
        job.progress = 1.0

        logger.info(
            "Job %s: completed (%.1fs processing)",
            job_id,
            result.processing_time_seconds,
        )

        # Send callback if requested
        if callback_url:
            await _send_callback(callback_url, result)

    except Exception as exc:
        logger.exception("Job %s: failed - %s", job_id, exc)
        job.status = JobStatus.failed
        job.error = str(exc)
        job.completed_at = datetime.now(timezone.utc).isoformat()

    finally:
        # Clean up temp files
        if audio_path and os.path.exists(audio_path):
            os.unlink(audio_path)
        if tmp_dir and os.path.exists(tmp_dir):
            try:
                os.rmdir(tmp_dir)
            except OSError:
                pass


async def _send_callback(callback_url: str, result: TranscriptionResult) -> None:
    """POST transcription result to the callback URL."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                callback_url,
                json=result.model_dump(),
                headers={"Content-Type": "application/json"},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                logger.info(
                    "Callback to %s returned status %d", callback_url, resp.status
                )
    except Exception as exc:
        logger.error("Callback to %s failed: %s", callback_url, exc)


# Auxiliary metadata store for jobs (audio_url, callback_url, etc.)
_job_meta: dict[str, dict[str, Any]] = {}


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------


@app.get("/health")
async def health():
    """Health check endpoint."""
    mode = "nemo" if (TRANSCRIPTION_MODE == "nemo" and NEMO_AVAILABLE) else "mock"
    return {
        "status": "ok",
        "mode": mode,
        "nemo_available": NEMO_AVAILABLE,
        "model": MODEL_NAME if mode == "nemo" else None,
        "active_jobs": sum(
            1
            for j in jobs.values()
            if j.status in (JobStatus.pending, JobStatus.processing)
        ),
    }


@app.post("/transcribe", response_model=TranscriptionResult)
async def transcribe(
    file: UploadFile = File(...),
    language: str = Query("en", description="Language code for transcription"),
    recording_id: str = Query(None, description="Associated recording ID"),
):
    """
    Synchronous transcription endpoint.

    Accepts an audio file (WAV or Opus) via multipart/form-data and returns
    the transcription result with word-level timestamps and confidence scores.
    """
    if file.filename is None:
        raise HTTPException(status_code=400, detail="No filename provided")

    # Validate content type loosely
    allowed_extensions = {".wav", ".opus", ".ogg", ".webm", ".mp3", ".flac"}
    ext = Path(file.filename).suffix.lower()
    if ext not in allowed_extensions:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format: {ext}. Supported: {', '.join(sorted(allowed_extensions))}",
        )

    # Save uploaded file to temp location
    tmp_dir = tempfile.mkdtemp(prefix="transcription_")
    audio_path = os.path.join(tmp_dir, f"upload{ext}")

    try:
        content = await file.read()
        with open(audio_path, "wb") as f:
            f.write(content)

        logger.info(
            "Received file: %s (%d bytes), recording_id=%s",
            file.filename,
            len(content),
            recording_id,
        )

        result = await _transcribe_audio(
            audio_path,
            language=language,
            recording_id=recording_id,
        )

        return result

    except Exception as exc:
        logger.exception("Transcription failed: %s", exc)
        raise HTTPException(status_code=500, detail=f"Transcription failed: {exc}")

    finally:
        if os.path.exists(audio_path):
            os.unlink(audio_path)
        try:
            os.rmdir(tmp_dir)
        except OSError:
            pass


@app.post("/jobs", response_model=JobInfo)
async def create_job(request: JobCreateRequest):
    """
    Create an asynchronous transcription job.

    The server will download the audio from `audio_url`, transcribe it, and
    optionally POST the result to `callback_url` when complete.
    """
    job_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    job = JobInfo(
        job_id=job_id,
        recording_id=request.recording_id,
        status=JobStatus.pending,
        progress=0.0,
        created_at=now,
    )
    jobs[job_id] = job

    # Store metadata for the background worker
    _job_meta[job_id] = {
        "audio_url": request.audio_url,
        "callback_url": request.callback_url,
        "language": request.language,
    }

    logger.info(
        "Job %s created: recording_id=%s, audio_url=%s",
        job_id,
        request.recording_id,
        request.audio_url,
    )

    # Launch background processing
    asyncio.create_task(_process_job(job_id))

    return job


@app.get("/jobs/{job_id}", response_model=JobInfo)
async def get_job(job_id: str):
    """Get the status and result of an async transcription job."""
    job = jobs.get(job_id)
    if job is None:
        raise HTTPException(status_code=404, detail=f"Job not found: {job_id}")
    return job


# ---------------------------------------------------------------------------
# Startup / shutdown
# ---------------------------------------------------------------------------


@app.on_event("startup")
async def startup():
    mode = "nemo" if (TRANSCRIPTION_MODE == "nemo" and NEMO_AVAILABLE) else "mock"
    logger.info("Transcription server starting in %s mode", mode.upper())
    if mode == "nemo":
        # Pre-load model in background to avoid first-request latency
        loop = asyncio.get_event_loop()
        loop.run_in_executor(None, _load_nemo_model)


@app.on_event("shutdown")
async def shutdown():
    logger.info("Transcription server shutting down")
    # Cancel any pending jobs
    for job in jobs.values():
        if job.status in (JobStatus.pending, JobStatus.processing):
            job.status = JobStatus.failed
            job.error = "Server shutting down"
            job.completed_at = datetime.now(timezone.utc).isoformat()
