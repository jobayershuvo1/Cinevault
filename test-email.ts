import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const user = 'jobayeribnjahir@gmail.com';
const pass = 'vamrxozstcxjxqfg';

console.log("Using user:", user);
console.log("Pass length:", pass ? pass.length : 0);

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: user,
    pass: pass
  }
});

transporter.sendMail({
  from: `"Test" <${user}>`,
  to: user,
  subject: "Test Email",
  text: "This is a test."
}).then(() => {
  console.log("Success");
}).catch(err => {
  console.error("Error:", err);
});
