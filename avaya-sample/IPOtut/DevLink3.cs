using System;
using System.Collections.Generic;
using System.ComponentModel;
using System.Data;
using System.Drawing;
using System.Linq;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Net.Sockets;

namespace IPOtut
{
    public partial class DevLink3 : Form
    {
        private const int ipoport = 50797; // not using TLS
        delegate void SetTextCallback(string text);

        TcpClient client;
        NetworkStream stream;
        Thread background = null;

        private string pendingRequest;

        public static class PacketTypes
        {
            public static string Test { get { return "002A0001"; } }
            public static string TestR { get { return "802A0001"; } }
            public static string Authenticate { get { return "00300001"; } }
            public static string AuthenticateR { get { return "80300001"; } }
            public static string EventRequest { get { return "00300011"; } }
            public static string EventRequestR { get { return "80300011"; } }
            public static string Event { get { return "10300011"; } }
        }

        public static class Response
        {
            public static string Pass {  get { return "00000000"; } }
            public static string Fail { get { return "80000041"; } }
            public static string Challenge { get { return "00000002"; } }
            public static string UnknownFlag { get { return "80000021"; } }
        }

        public DevLink3()
        {
            InitializeComponent();
        }

        private void SetText(string text)
        {
            if (this.Status.InvokeRequired)
            {
                SetTextCallback d = new SetTextCallback(SetText);
                this.Invoke(d, new object[] { text });
            }
            else
            {
                this.Status.Text = this.Status.Text + text;
            }
        }

        public void Receive()
        {
            byte[] bytes = new byte[1024];
            while (true)
            {
                int bytesRead = stream.Read(bytes, 0, bytes.Length);
                this.SetText("\r\nR: " + BitConverter.ToString(bytes, 0).Replace("-", string.Empty));
                if(ParseHeader(bytes) == PacketTypes.AuthenticateR)
                {
                    if ((ParseRequestID(bytes) == pendingRequest) && (bytesRead>16))
                    {
                        if (ParseResponse(bytes) == Response.Challenge)
                        {
                            Packet RTest = null;
                            RTest = new Packet(PacketTypes.Authenticate, GetChallenge(bytes), Password.Text);
                            RTest.BuildBuffer();
                            pendingRequest = RTest.requestid;
                            stream.Write(RTest.Bytes, 0, RTest.Bytes.Length);
                            this.SetText("\r\nChallengeS: " + BitConverter.ToString(RTest.Bytes, 0).Replace("-", string.Empty));
                        }
                        else if (ParseResponse(bytes) == Response.Fail)
                            this.SetText("\r\n Authentication failed");
                        else if (ParseResponse(bytes) == Response.Pass)
                        {
                            this.SetText("\r\n Authenticate succeeded");
                            Packet ETest = null;
                            ETest = new Packet(PacketTypes.EventRequest, EventFlags.Text.Trim());
                            ETest.BuildBuffer();
                            pendingRequest = ETest.requestid;
                            stream.Write(ETest.Bytes, 0, ETest.Bytes.Length);
                            this.SetText("\r\nEventS: " + BitConverter.ToString(ETest.Bytes, 0).Replace("-", string.Empty));
                        }
                    }
                }
                if (ParseHeader(bytes) == PacketTypes.TestR)
                    this.SetText("\r\n Test responded");
                if (ParseHeader(bytes) == PacketTypes.EventRequestR)
                {
                    if (ParseResponse(bytes) == Response.UnknownFlag)
                        this.SetText("\r\n Event unknown flag string");
                    else if (ParseResponse(bytes) == Response.Pass)
                        this.SetText("\r\n Event register success");
                }
                if (ParseHeader(bytes) == PacketTypes.Event)
                    this.SetText("\r\n Event received");
            }
        }

        private void Connect_Click(object sender, EventArgs e)
        {
            if (StartComms())
            {
                Packet STest = null;
                STest = new Packet(PacketTypes.Authenticate, UserName.Text);
                STest.BuildBuffer();
                pendingRequest = STest.requestid;
                stream.Write(STest.Bytes, 0, STest.Bytes.Length);
                this.SetText("\r\nConnectS: " + BitConverter.ToString(STest.Bytes, 0).Replace("-", string.Empty));
            }
        }

        private void TestPkt_Click(object sender, EventArgs e)
        {
            if (StartComms())
            {
                Packet STest = null;
                STest = new Packet(PacketTypes.Test);
                STest.BuildBuffer();
                stream.Write(STest.Bytes, 0, STest.Bytes.Length);
                this.SetText("\r\nTestS: " + BitConverter.ToString(STest.Bytes, 0).Replace("-", string.Empty));
            }
        }

        private bool StartComms()
        {
            bool retvalue = true;
            if(background == null)
            {
                retvalue = false;
                if (string.IsNullOrWhiteSpace(IPOaddress.Text))
                {
                    this.SetText("Need IPO address \r\n");
                }
                else
                {
                    this.SetText("Attempting establish connection \r\n");
                    try
                    {
                        client = new TcpClient(IPOaddress.Text, ipoport);
                        stream = client.GetStream();
                        background = new Thread(Receive);
                        background.Start();
                        retvalue = true;
                        this.SetText("Connected \r\n");
                    }
                    catch
                    {
                        this.SetText("Could not connect \r\n");
                        retvalue = false;
                    }
                }
            }
            return retvalue;
        }

        private void Exit_Click(object sender, EventArgs e)
        {
            System.Environment.Exit(1);
        }

        private string ParseHeader(byte[] Data)
        {
            return (BitConverter.ToString(Data, 0).Replace("-", string.Empty).Substring(6, 8));
        }

        private string ParseRequestID(byte[] Data)
        {
            return (BitConverter.ToString(Data, 0).Replace("-", string.Empty).Substring(14, 8));
        }

        private string ParseResponse(byte[] Data)
        {
            return (BitConverter.ToString(Data, 0).Replace("-", string.Empty).Substring(22, 8));
        }

        private byte[] GetChallenge(byte[] Data)
        {
            int size = Convert.ToInt16(Data[18]);
            byte [] result = new byte[size];
            Buffer.BlockCopy(Data, 19, result, 0, size);
            return result;
        }
    }
}
