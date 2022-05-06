const AWS = require("aws-sdk");
const express = require("express");
const bodyParser = require("body-parser");
const app = express();
app.use(express.json());
app.use(bodyParser.urlencoded({ extended: true }));
AWS.config.update({ region: "us-east-1" });

const dynamoClient = new AWS.DynamoDB.DocumentClient();

var getUsers = async (table) => {
  const params = {
    TableName: table,
  };

  try {
    const users = await dynamoClient.scan(params).promise();
    //console.log(users);
    return users;
  } catch (e) {
    if (e.statusCode === 400) {
      console.log("Error Found");
    }
  }
};

getUsers();

var addOrUpdateUser = async (user, table) => {
  const params = {
    TableName: table,
    Item: user,
  };
  return await dynamoClient.put(params).promise();
};

const getUserByID = async (email) => {
  const params = {
      TableName: "Profile_user",
      Key: {
          email
      }
  };
  return await dynamoClient.get(params).promise();
};

const deleteUser = async (email_id) => {
  const params = {
    TableName: TABLE_NAME,
    Key: {
      email_id,
    },
  };
  return await dynamoClient.delete(params).promise();
};

let array1 = [];
let getDataById = function (inputEmail, table) {
  var params = {
    TableName: table,
    Key: {
      //id
      email: inputEmail,
    },
  };
  dynamoClient.get(params, function (err, data) {
    if (err) {
      console.log(JSON.stringify(err, null, 2));
    } else {
      //console.log(data['Item']);

      const obj1 = { email: data["Item"]["email"] };
      const obj2 = { name: data["Item"]["name"] };
      array1.push(obj1, obj2);
      console.log(array1);
      app.get("/profile", (req, res) => {
        res.render("profile", {array1:array1});
      });
    }
  });
};

module.exports = {
  dynamoClient,
  getUserByID,
  getUsers,
  deleteUser,
  addOrUpdateUser,
  getDataById,
  array1,
};
