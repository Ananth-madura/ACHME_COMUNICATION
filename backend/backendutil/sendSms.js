const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
});

transporter.verify((error, success) => {
  if (error) {
    console.error("OTP email transporter verification failed:", error.message);
  } else {
    console.log("OTP email transporter is ready");
  }
});

const sendEmailOtp = async (email, otp) => {
  await transporter.sendMail({
    from: `"OTP Service" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "Your Registration OTP",
    html: `
      <h2>Your OTP is ${otp}</h2>
      <p>This OTP is valid for 5 minutes.</p>
    `,
  });
};

module.exports = sendEmailOtp;
