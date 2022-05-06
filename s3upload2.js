const fs = require("fs");
const AWS = require("aws-sdk");

aws_access_key_id = "Your access key id";
aws_secret_access_key = "Your secret access key";
aws_bucket_name = "Your aws bucket name";

const s3 = new AWS.S3({
  accessKeyId: aws_access_key_id,
  secretAccessKey: aws_secret_access_key,
});

var filename = "img1.jpg";
var fileContent = fs.readFileSync(filename);

const uploadFile = async () => {
  fs.readFile(filename, (err, data) => {
    if (err) throw err;
    const params = {
      Bucket: aws_bucket_name,
      Key: `${filename}`,
      Body: JSON.stringify(data, null, 2),
    };
    s3.upload(params, function (s3Err, data) {
      if (s3Err) throw s3Err;
      var u = `${data.Location}`.toString();
      console.log(u);
    });
  });
};

module.exports = { uploadFile };
