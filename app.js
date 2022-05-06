const express = require("express");
const S3 = require("aws-sdk/clients/s3");
const { uploadFile } = require("./s3upload");
const {
  addOrUpdateUser,
  getUsers,
  getUserByID,
  getDataById,
  array1,
} = require("./dynamo");
const app = express();
const AWS = require("aws-sdk");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const session = require("express-session");
const fs = require("fs");
const cors = require("cors");
global.fetch = require("node-fetch");
const AmazonCognitoIdentity = require("amazon-cognito-identity-js");
const multer = require("multer");
const http = require("http");
const path = require("path");
const shortid = require("shortid");
const httpServer = http.createServer(app);

aws_access_key_id = "Your aws access key id";
aws_secret_access_key = "Your aws secret access key";

app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
const port = 3000;

AWS.config.update({
  region: "us-east-1",
  endpoint: "http://localhost:3000",
  accessKeyId: aws_access_key_id,
  secretAccessKey: aws_secret_access_key,
});

var dynamoClient = new AWS.DynamoDB.DocumentClient();
const { Buffer } = require("buffer");

const poolData = {
  UserPoolId: "Your user pool id",
  ClientId: "Your client id",
  IdentityPoolId: "Your identity pool id",
};
const iamuser = {
  access_key_id: "Your access key id",
  secret_access_key: "Your secret access key",
};

const pool_region = "ap-south-1";
const ses = new AWS.SES({ region: "us-east-1" });
const userPool = new AmazonCognitoIdentity.CognitoUserPool(poolData);

app.use(express.static("public"));
app.use("/css", express.static(__dirname + "public/css"));
app.use("/js", express.static(__dirname + "public/js"));
app.use("/img", express.static(__dirname + "public/img"));
app.use("/webfonts", express.static(__dirname + "public/webfonts"));
app.use("/images", express.static(__dirname + "public/images"));
app.use("/images/icon", express.static(__dirname + "public/images/icon"));
app.use("/vendor", express.static(__dirname + "public/vendor"));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(cors());

global.globalString = "";

//Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "/uploads"));
  },
  filename: (req, file, cb) => {
    cb(null, shortid.generate() + "-" + file.originalname);
  },
});

const imageFileFilter = (req, file, cb) => {
  if (!file.originalname.match(/\.(jpg|jpeg|png|gif|JPG|JPEG|PNG|GIF)$/)) {
    return cb(new Error("You can upload only image files!"));
  }
  cb(null, true);
};

const upload = multer({ storage: storage, fileFilter: imageFileFilter });

// app.use(
//   session({
//     key:'user_session_id',
//     secret:"session_secret_key",
//     resave:true,
//     saveUninitialized:false,
//     cookie:{
//       expires:600000
//     }
//   })
// )
// app.use((req,res,next) => {
//   if(req.session.user && req.cookies.user_session_id)
//   {
//   res.redirect('/home')
//   }
//   next();
// })
//
// var sessionChecker = (req, res, next) => {
//   if (req.session.user && req.cookies.user_session_id) {
//     res.redirect("/home");
//   } else {
//     next();
//   }
// };
//
//
// app.get("/index", sessionChecker, (req, res) => {
//   res.redirect("/log-in");
// });
//
// app.route("/log-in")
//   .get(sessionChecker, (req, res) => {
//   res.render("log-in");
//   })

//set views
app.set("views", "./views");
app.set("view engine", "ejs");

app.get("/index", (req, res) => {
  res.render("index");
});

app.get("/log-in", (req, res) => {
  res.render("log-in");
  var inputVal = req.query.email;
  console.log(inputVal);
});

app.get("/log-out", (req, res) => {
  return res.render("log-out");
});

app.get("/signup", (req, res) => {
  res.render("signup");
});

app.post("/signup", (req, res) => {
  // res.send(req.body);

  const email = req.body.email;
  const name = req.body.name;
  const password = req.body.password;
  const confirmpassword = req.body.confirmpassword;
  const gender = req.body.gender;
  const skillsknown = req.body.skillsknown;

  const signup = {
    email: email,
    name: name,
    password: password,
    gender: gender,
    skills: skillsknown,
  };

  if (password !== confirmpassword) {
    return res.redirect("/signup?error=passwords");
  }
  const emailData = {
    Name: "email",
    Value: email,
  };
  const username = {
    Name: "username",
    Value: name,
  };

  const emailAttribute = new AmazonCognitoIdentity.CognitoUserAttribute(
    emailData
  );

  userPool.signUp(email, password, [emailAttribute], null, (err, data) => {
    if (err) {
      return console.error(err);
    }
    addOrUpdateUser(signup, "Signup_users");
    addOrUpdateUser(signup, "Profile_user");
    res.render("successful.ejs", { username: username });
    // res.send("Hello " + name + ", Thank you for registering. You email is " + email);
  });
});

app.post("/log-in", (req, res) => {
  const email_id = {
    email: req.body.email,
  };

  globalString = req.body.email;

  const loginDetails = {
    Username: req.body.email,
    Password: req.body.password,
  };

  const authenticationDetails = new AmazonCognitoIdentity.AuthenticationDetails(
    loginDetails
  );

  const userDetails = {
    Username: req.body.email,
    Pool: userPool,
  };
  const cognitoUser = new AmazonCognitoIdentity.CognitoUser(userDetails);

  cognitoUser.authenticateUser(authenticationDetails, {
    onSuccess: (data) => {
      console.log(data);
      addOrUpdateUser(email_id, "Login_users");
      res.redirect("/home");
    },
    onFailure: (err) => {
      console.error(err);
      res.redirect("/unverified");
    },
  });
});

app.get("/battles", async (req, res) => {
  let user = await getUserByID(globalString);
  res.render("battles", { user: user });
});

app.post("/battles", upload.array("img", 10), async (req, res) => {
  var battle_table = "Battles_Registration";
  const battle = {
    email: globalString,
    phone: req.body.phone,
  };
  const img = req.files;
  const imagePaths = [];

  for (let i = 0; i < img.length; i++) {
    imagePaths[i] = img.at(i).filename;
  }

  for (let i = 0; i < img.length; i++) {
    uploadFile(img.at(i));
  }
  const newUser = await addOrUpdateUser(battle, battle_table);
  res.redirect("/battles");
});

//testing multer upload
app.post("/profile", upload.array("img", 5), async (req, res) => {
  const img = req.files;
  const imagePaths = [];

  for (let i = 0; i < img.length; i++) {
    imagePaths[i] = img.at(i).filename;
  }

  //  for (let i = 0; i < imagePaths.length; i++) {
  //   console.log(imagePaths[i]);
  // }
  uploadFile(img.at(0));
  const imgLocation =
    "Your s3  file URL" + img.at(0).filename;
  console.log(imgLocation);

  const profile = {
    email: globalString,
    name: req.body.name,
    phone: req.body.phone,
    skills: req.body.skills,
    img: imgLocation,
  };

  //console.log("user data",profile);
  addOrUpdateUser(profile, "Profile_user");
  res.redirect("/profile");
});

app.get("/unverified", (req, res) => {
  res.render("unverified");
});

app.get("/challenge", (req, res) => {
  res.render("challenge");
});

app.get("/connections", async (req, res) => {
  let user = await getUserByID(globalString);
  res.render("connections", { user: user });
});

app.post("/connections", (req, res) => {
  const sourceEmail = "abc@gmail.com";
  const message =
    "Dear user" +
    referalemail +
    ", thanks for registering with TalentGig. You have been referred by " +
    sourceEmail +
    "\n . For any query, please reach out to TalentGig at talentgig@gmail.com";
  const name = "nilesh";

  // Verify email addresses.

  var params = {
    EmailAddress: sourceEmail,
  };

  //console.log("req", req.body);
  sesTest(referalemail, sourceEmail, message, name)
    .then((val) => {
      console.log("got this back", val);
      //res.send("Successfully Sent Email");
    })
    .catch((err) => {
      //res.send(err);

      console.log("There was an error!", err);
    });

  ses.verifyEmailAddress(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });

  function sesTest(emailTo, emailFrom, message, name) {
    var params = {
      Destination: {
        ToAddresses: [emailTo],
      },
      Message: {
        Body: {
          Text: { Data: "From Contact Form: " + name + "\n " + message },
        },

        Subject: { Data: "Hello " + emailFrom + "Welcome to TalentGig." },
      },
      Source: "abc@gmail.com",
    };

    return ses.sendEmail(params).promise();
  }
});

app.post("/home", (req, res) => {
  const referalemail = req.body.sendreferral;
  const sourceEmail = "abc@gmail.com";
  const message =
    "Dear user" +
    referalemail +
    ", thanks for registering with TalentGig. You have been referred by " +
    sourceEmail +
    "\n . For any query, please reach out to TalentGig at talentgig@gmail.com";
  const name = "nilesh";

  // Verify email addresses.

  var params = {
    EmailAddress: sourceEmail,
  };

  //console.log("req", req.body);
  sesTest(referalemail, sourceEmail, message, name)
    .then((val) => {
      console.log("got this back", val);
      //res.send("Successfully Sent Email");
    })
    .catch((err) => {
      //res.send(err);

      console.log("There was an error!", err);
    });

  ses.verifyEmailAddress(params, function (err, data) {
    if (err) {
      console.log(err);
    } else {
      console.log(data);
    }
  });

  function sesTest(emailTo, emailFrom, message, name) {
    var params = {
      Destination: {
        ToAddresses: [emailTo],
      },
      Message: {
        Body: {
          Text: { Data: "Dear" + name + "\n " + message },
        },

        Subject: { Data: "Hello " + emailFrom + "Welcome to TalentGig." },
      },
      Source: "abc@gmail.com",
    };

    return ses.sendEmail(params).promise();
  }
});

app.get("/home", async (req, res) => {
  let userPosts = await getUsers("Post_user");
  //console.log(userPosts.Items[0]);
  let user = await getUserByID(globalString);
  //console.log(user.Item.comment);
  res.render("home", { userPosts: userPosts, user: user });
});

app.post("/create-post", upload.array("img", 5), (req, res) => {
  const img = req.files;
  const imagePaths = [];

  for (let i = 0; i < img.length; i++) {
    imagePaths[i] = img.at(i).filename;
  }

  const imgLocation =
    "Your s3 url for image" + img.at(0).filename;

  for (let i = 0; i < img.length; i++) {
    uploadFile(img.at(i));
  }
  const post = {
    email: globalString,
    description: req.body.description,
    tags: req.body.tags,
    img: imgLocation,
  };
  addOrUpdateUser(post, "Post_user");
  res.redirect("/home");
});

app.get("/popup", (req, res) => {
  res.render("popup");
});

app.get("/succesful", (req, res) => {
  res.render("popup");
});

app.get("/profile", async (req, res) => {
  const user = await getUserByID(globalString);
  //console.log(user.Item.comment);
  res.render("profile", { user: user });
});

app.listen(port, function () {
  console.log("app listening on port " + port);
});
