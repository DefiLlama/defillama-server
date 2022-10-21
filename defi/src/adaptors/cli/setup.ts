import AWS from "aws-sdk";

// Importing env file
require('dotenv').config()
AWS.config.update({ region: 'eu-central-1' });