namespace IPOtut
{
    partial class DevLink3
    {
        /// <summary>
        /// Required designer variable.
        /// </summary>
        private System.ComponentModel.IContainer components = null;

        /// <summary>
        /// Clean up any resources being used.
        /// </summary>
        /// <param name="disposing">true if managed resources should be disposed; otherwise, false.</param>
        protected override void Dispose(bool disposing)
        {
            if (disposing && (components != null))
            {
                components.Dispose();
            }
            base.Dispose(disposing);
        }

        #region Windows Form Designer generated code

        /// <summary>
        /// Required method for Designer support - do not modify
        /// the contents of this method with the code editor.
        /// </summary>
        private void InitializeComponent()
        {
            this.Connect = new System.Windows.Forms.Button();
            this.IPOaddress = new System.Windows.Forms.TextBox();
            this.Status = new System.Windows.Forms.TextBox();
            this.TestPkt = new System.Windows.Forms.Button();
            this.Exit = new System.Windows.Forms.Button();
            this.Password = new System.Windows.Forms.TextBox();
            this.UserName = new System.Windows.Forms.TextBox();
            this.label1 = new System.Windows.Forms.Label();
            this.label2 = new System.Windows.Forms.Label();
            this.label3 = new System.Windows.Forms.Label();
            this.label4 = new System.Windows.Forms.Label();
            this.EventFlags = new System.Windows.Forms.TextBox();
            this.SuspendLayout();
            // 
            // Connect
            // 
            this.Connect.Location = new System.Drawing.Point(710, 277);
            this.Connect.Name = "Connect";
            this.Connect.Size = new System.Drawing.Size(75, 23);
            this.Connect.TabIndex = 4;
            this.Connect.Text = "Connect";
            this.Connect.UseVisualStyleBackColor = true;
            this.Connect.Click += new System.EventHandler(this.Connect_Click);
            // 
            // IPOaddress
            // 
            this.IPOaddress.Location = new System.Drawing.Point(691, 60);
            this.IPOaddress.Name = "IPOaddress";
            this.IPOaddress.Size = new System.Drawing.Size(112, 20);
            this.IPOaddress.TabIndex = 0;
            // 
            // Status
            // 
            this.Status.Location = new System.Drawing.Point(21, 60);
            this.Status.Multiline = true;
            this.Status.Name = "Status";
            this.Status.ScrollBars = System.Windows.Forms.ScrollBars.Vertical;
            this.Status.Size = new System.Drawing.Size(585, 546);
            this.Status.TabIndex = 6;
            // 
            // TestPkt
            // 
            this.TestPkt.Location = new System.Drawing.Point(710, 99);
            this.TestPkt.Name = "TestPkt";
            this.TestPkt.Size = new System.Drawing.Size(75, 23);
            this.TestPkt.TabIndex = 3;
            this.TestPkt.Text = "Test Pkt";
            this.TestPkt.UseVisualStyleBackColor = true;
            this.TestPkt.Click += new System.EventHandler(this.TestPkt_Click);
            // 
            // Exit
            // 
            this.Exit.Location = new System.Drawing.Point(710, 571);
            this.Exit.Name = "Exit";
            this.Exit.Size = new System.Drawing.Size(75, 23);
            this.Exit.TabIndex = 5;
            this.Exit.Text = "Exit";
            this.Exit.UseVisualStyleBackColor = true;
            this.Exit.Click += new System.EventHandler(this.Exit_Click);
            // 
            // Password
            // 
            this.Password.Location = new System.Drawing.Point(691, 196);
            this.Password.Name = "Password";
            this.Password.PasswordChar = '*';
            this.Password.Size = new System.Drawing.Size(112, 20);
            this.Password.TabIndex = 2;
            // 
            // UserName
            // 
            this.UserName.Location = new System.Drawing.Point(691, 170);
            this.UserName.Name = "UserName";
            this.UserName.Size = new System.Drawing.Size(112, 20);
            this.UserName.TabIndex = 1;
            // 
            // label1
            // 
            this.label1.AutoSize = true;
            this.label1.Location = new System.Drawing.Point(628, 173);
            this.label1.Name = "label1";
            this.label1.Size = new System.Drawing.Size(57, 13);
            this.label1.TabIndex = 7;
            this.label1.Text = "UserName";
            // 
            // label2
            // 
            this.label2.AutoSize = true;
            this.label2.Location = new System.Drawing.Point(628, 199);
            this.label2.Name = "label2";
            this.label2.Size = new System.Drawing.Size(53, 13);
            this.label2.TabIndex = 8;
            this.label2.Text = "Password";
            // 
            // label3
            // 
            this.label3.AutoSize = true;
            this.label3.Location = new System.Drawing.Point(628, 63);
            this.label3.Name = "label3";
            this.label3.Size = new System.Drawing.Size(58, 13);
            this.label3.TabIndex = 9;
            this.label3.Text = "IP Address";
            // 
            // label4
            // 
            this.label4.AutoSize = true;
            this.label4.Location = new System.Drawing.Point(628, 236);
            this.label4.Name = "label4";
            this.label4.Size = new System.Drawing.Size(58, 13);
            this.label4.TabIndex = 10;
            this.label4.Text = "Event Flag";
            // 
            // EventFlags
            // 
            this.EventFlags.Location = new System.Drawing.Point(691, 233);
            this.EventFlags.Name = "EventFlags";
            this.EventFlags.Size = new System.Drawing.Size(112, 20);
            this.EventFlags.TabIndex = 11;
            this.EventFlags.Text = "-SIPTrack";
            // 
            // DevLink3
            // 
            this.AutoScaleDimensions = new System.Drawing.SizeF(6F, 13F);
            this.AutoScaleMode = System.Windows.Forms.AutoScaleMode.Font;
            this.ClientSize = new System.Drawing.Size(830, 618);
            this.Controls.Add(this.EventFlags);
            this.Controls.Add(this.label4);
            this.Controls.Add(this.label3);
            this.Controls.Add(this.label2);
            this.Controls.Add(this.label1);
            this.Controls.Add(this.UserName);
            this.Controls.Add(this.Password);
            this.Controls.Add(this.Exit);
            this.Controls.Add(this.TestPkt);
            this.Controls.Add(this.Status);
            this.Controls.Add(this.IPOaddress);
            this.Controls.Add(this.Connect);
            this.Name = "DevLink3";
            this.Text = "DevLink3";
            this.ResumeLayout(false);
            this.PerformLayout();

        }

        #endregion

        private System.Windows.Forms.Button Connect;
        private System.Windows.Forms.TextBox IPOaddress;
        private System.Windows.Forms.TextBox Status;
        private System.Windows.Forms.Button TestPkt;
        private System.Windows.Forms.Button Exit;
        private System.Windows.Forms.TextBox Password;
        private System.Windows.Forms.TextBox UserName;
        private System.Windows.Forms.Label label1;
        private System.Windows.Forms.Label label2;
        private System.Windows.Forms.Label label3;
        private System.Windows.Forms.Label label4;
        private System.Windows.Forms.TextBox EventFlags;
    }
}

