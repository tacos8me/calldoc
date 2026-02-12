using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading.Tasks;
using System.Globalization;
using System.Security.Cryptography;

namespace IPOtut
{
    class Packet
    {
        private byte[] Pbytes, Headerbytes, RIDBodybytes;
        public string hexheader, requestid, body, pktlength;

        public Packet(string hexvalue, string txt) : this(hexvalue)
        {
            if (hexheader == DevLink3.PacketTypes.Authenticate)
            {
                body = "00000001" + BitConverter.ToString(Encoding.UTF8.GetBytes(txt.Trim() + Char.MinValue)).Replace("-", string.Empty);
            }
            if (hexheader == DevLink3.PacketTypes.EventRequest)
            {
                txt = txt + Char.MinValue;
                body = (txt.Length / 2).ToString("X4") + BitConverter.ToString(Encoding.UTF8.GetBytes(txt.Trim())).Replace("-", string.Empty);
            }
        }


        public Packet(string hexvalue, byte [] challenge, string password) : this(hexvalue)
        {
           if (hexheader == DevLink3.PacketTypes.Authenticate)
           {
                string response;
                byte[] utf8pwd = new byte[16];
                byte[] HashBytes = new byte[challenge.Length + 16];

                Buffer.BlockCopy(Encoding.UTF8.GetBytes(password.Trim()), 0, utf8pwd, 0, (Encoding.UTF8.GetBytes(password.Trim()).Length < 17) ? Encoding.UTF8.GetBytes(password.Trim()).Length : 16);

                Buffer.BlockCopy(challenge, 0, HashBytes, 0, challenge.Length);
                Buffer.BlockCopy(utf8pwd, 0, HashBytes, challenge.Length, 16);

                SHA1 sha = SHA1.Create();
                byte[] HashOutp = sha.ComputeHash(HashBytes);

                response = BitConverter.ToString(HashOutp).Replace("-", string.Empty); ;
                body = "00000050" + (response.Length / 2).ToString("X8") + response;
            }
        }

        public Packet(string hexvalue)
        {
            hexheader = hexvalue;
            if (hexvalue == DevLink3.PacketTypes.Test)
            {
                body = "00000000";
            }
        }

        public void BuildBuffer()
        {
            RIDBodybytes = HexOcttoByte(RequestID() + body);
            pktlength = (3 + (hexheader.Length / 2) + (requestid.Length / 2) + (body.Length / 2)).ToString("X4");
            Headerbytes = HexOcttoByte("49" + pktlength + hexheader);
            Pbytes = new byte[Headerbytes.Length + RIDBodybytes.Length];
            Buffer.BlockCopy(Headerbytes, 0, Pbytes, 0, Headerbytes.Length);
            Buffer.BlockCopy(RIDBodybytes, 0, Pbytes, Headerbytes.Length, RIDBodybytes.Length);
        }

        public byte[] Bytes { get { return Pbytes; } }

        private byte[] HexOcttoByte(string input)
        {
            var length = input.Length / 2;
            var output = new byte[length];
            for (var i = 0; i < length; i++)
            {
                output[i] = Convert.ToByte(input.Substring((i * 2), 2), 16);
            }

            return output;
        }

        private string RequestID()
        {
            Random seed = new Random();
            int arb = seed.Next();
            requestid = arb.ToString("D8");
            if (requestid.Length > 8)
            {
                requestid = requestid.Substring(0, 8);
            }

            return requestid;
        }
    }
}
