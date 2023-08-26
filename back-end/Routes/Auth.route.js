const express = require('express')
const bcrypt = require("bcrypt");
const { builtinModules } = require('module')
const router = express.Router()
const jwt = require("jsonwebtoken");
const keys = require("jsonwebtoken");

require('dotenv').config()

require('../helpers/generate_keys')
const User = require('../Models/User.model');
const UserVerfication = require('../Models/UserVerification');
const { Console } = require('console');
const { exit } = require('process');

const nodemailer = require("nodemailer");

const {v4: uuidv4} = require("uuid")

const path = require('path');

let transporter = nodemailer.createTransport({
  host: 'smtp.mailtrap.io',
  port: 2525,
   auth:{
     user : process.env.AUTH_EMAIL,
     pass : process.env.AUTH_PASS,
   }
})

transporter.verify((error, success) => {
  if(error)
  {
    console.log(error);
  }
  else{
    console.log("Ready for message");
    console.log(success);
  }
})

router.post('/register', async (req, res, next) => {
    
  try {
    const { email, password } = req.body;

    if (!(email && password)) {
      res.status(400).send("All input is required");
    }

    const oldUser = await User.findOne({ email });

    if (oldUser) {
      return res.status(409).send("User Already Exist. Please Login");
    }

    encryptedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email: email.toLowerCase(), // sanitize: convert email to lowercase
      password: encryptedPassword,
      verified:false,
    });

    const access_token = jwt.sign(
      { user_id: user._id, email },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "2h",
      }
    );
    
    const refresh_token = jwt.sign(
        { user_id: user._id, email },
        process.env.REFRESH_TOKEN_SECRET,
        {
          expiresIn: "1y",
        }
      );
    
      sendVerificationEmail(user,res)
      
      // user
      res.status(201).json({user,access_token,refresh_token});

  } catch (err) {
    console.log(err);
  }
})

router.post('/login', async (req, res, next) => {
    try {

        const { email, password } = req.body;
    
        if (!(email && password)) {
          res.status(400).send("All input is required");
        }
        const user = await User.findOne({ email });
    
        if (user && (await bcrypt.compare(password, user.password))) {
          
          const access_token = jwt.sign(
            { user_id: user._id, email },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: "2h",
            }
          );

          const refresh_token = jwt.sign(
            { user_id: user._id, email },
            process.env.REFRESH_TOKEN_SECRET,
            {
              expiresIn: "1y",
            }
          );
        
          // user
          res.status(200).send({user,auth:access_token});
        }
       res.status(400).send({result:'Invalid Credentials'});
      } catch (err) {
        console.log(err);
      }
})

const sendVerificationEmail = ({_id,email}, res) => {
  const current_url = "http://localhost:5000/";
  const uniqueString = uuidv4() + _id;

  const mailOptions = {
    from : process.env.AUTH_EMAIL,
    to : email,
    subject : "Verify your email",
    html : `<p>verify email to complete signup process</p><br><p><a href=${current_url + "auth/verify/" + _id + "/" + uniqueString}>here</p>`
  };
  const sailRounds = 10;
  bcrypt
    .hash(uniqueString, sailRounds )
    .then((hashedUniqueString)=>{
      const newVerfication = new UserVerfication({
        userID: _id,
        uniqueString:hashedUniqueString,
        createdAt: Date.now(),
        expiresAt: Date.now() + 21600000,
      });

      newVerfication
      .save()
      .then(()=>{
        transporter.sendMail(mailOptions)
        .then(()=>{
          console.log("Email Sent");
          // res.json({
          //   status : "Pending",
          //   message : "Verification Email Sent",
          // });
        })
        .catch((error) => {
          console.log(error);
          // res.json({
          //   status : "failed",
          //   message : "Verification Email failed",
          // });
        })
      })
      .catch((error) => {
        console.log(error);
        // res.json({
        //   status : "failed",
        //   message : "Couldn't save verification email data",
        // });
      })

    })
    .catch(()=>{
      // res.json({
      //   status : "failed",
      //   message : "An error occured while hashing email",
      // });
    })
};

router.get("/verify/:userID/:uniqueString", (req,res) => {

  let {userID, uniqueString} = req.params

  UserVerfication
  .find({userID})
  .then((result)=>{
    if(result.length > 0){
      const {expiresAt} = result[0];
      const hashedUniqueString = result[0].uniqueString;

      if(expiresAt < Date.now())
      {
        UserVerfication.deleteOne({userID})
        .then(result=>{
          User.deleteOne({_id:userID})
          .then(() => {
          Console.log(error)
          let message = "link has expired please signup again ";
          res.redirect(`/auth/verified/error=true&message=${message}`);
        })
        .catch(error => {
          Console.log(error)
          let message = "Clearing user with expired unique string failed ";
          res.redirect(`/auth/verified/error=true&message=${message}`);
        })
      })
        .catch((error)=>{
          Console.log(error)
          let message = "An error occured while clearing expired user verification record ";
          res.redirect(`/auth/verified/error=true&message=${message}`);
        })
      }
      else{

        bcrypt
        .compare(uniqueString,hashedUniqueString)
        .then(result => {
          if(result){
            User
            .updateOne({_id:userID},{verified:true})
            .then(() => {
              UserVerfication
              .deleteOne({userID})
              .then((result) => {
                console.log("verifying");
                res.sendFile(path.join(__dirname, "../views/verified.html"));

              })
              .catch(error => {
                console.log(error);

                let message = "An error occured while finalizing successfull verification";
                res.redirect(`/auth/verified/error=true&message=${message}`);
              })
            })
            .catch(error => {
              console.log();
              let message = "An error occured while updating user record to show verified";
              res.redirect(`/auth/verified/error=true&message=${message}`);
            })
          }
          else{
            let message = "Invalid verification details passed check your inbox";
            res.redirect(`/auth/verified/error=true&message=${message}`);
          }
        })
        .catch(error => {
            let message = "An error occured while comparing unique strings";
            res.redirect(`/auth/verified/error=true&message=${message}`);
        })

      }
    }
    else{
      let message = "Account record does not exist";
      res.redirect(`/auth/verified/error=true&message=${message}`);
    }
  })
  .catch((error) => {
    console.log(error)
    let message = "An error occured while checking for new existing user verified";
    res.redirect(`/auth/verified/error=true&message=${message}`);
  })

});

router.get("/verified", (req,res) => {
    res.sendFile(path.join(__dirname, "../views/verified.html"));
})

router.post('/refresh-token', async (req, res, next) => {
    try {

        const { refreshtoken} = req.body;
    
        const verify_refresh_token = jwt.verify(
            refreshtoken,
            process.env.REFRESH_TOKEN_SECRET,
          );

        user_email=verify_refresh_token.email
        user_id=verify_refresh_token.user_id

        const regenerated_access_token = jwt.sign(
            { user_id: user_id, user_email },
            process.env.ACCESS_TOKEN_SECRET,
            {
              expiresIn: "2h",
            }
          );

          const regenerated_refresh_token = jwt.sign(
            { user_id: user_id, user_email },
            process.env.REFRESH_TOKEN_SECRET,
            {
              expiresIn: "1y",
            }
          );

          res.status(200).json({regenerated_access_token,regenerated_refresh_token});

    }catch{

    }

})

router.delete('/logout', async (req, res, next) => {
    res.send("Logout Route")
})


module.exports = router