const AWS = require('aws-sdk')
const aws_config = require('../credentials/aws_config')
const dynaDoc = require("dynamodb-doc")
AWS.config.update(aws_config)
const Rx = require('rxjs')

const dynamodb = new AWS.DynamoDB({
  dynamodb: '2012-08-10',
  region: "us-east-1"
})
const docClient = new dynaDoc.DynamoDB(dynamodb)


modules.grabConvosForLandlord = function(landlord_id) {
  const p = new Promise((res, rej) => {
    const bothSides = [
      query_dynamodb('By_RECEIVER_ID', 'RECEIVER_ID', landlord_id),
      query_dynamodb('By_SENDER_ID', 'SENDER_ID', landlord_id)
    ]
    Promise.all(bothSides).then((messages) => {
      console.log(messages.length)
      res()
    }).catch((err) => {
      console.log(err)
      rej(err)
    })
  })
  return p
}


exports.query_dynamodb = function(indexName, indexKey, landlord_id) {
	const params = {
      "TableName": "Building_Interactions_Intel",
      "KeyConditionExpression": "#LANDLORD_ID = :building_id",
      "IndexName": indexName,
      "FilterExpression": "#DATE > :date",
      "ExpressionAttributeNames": {
        "#LANDLORD_ID": indexKey,
      },
      "ExpressionAttributeValues": {
        ":building_id": landlord_id,
        ":date": 1512940693
      }
    }
  const p = new Promise((res, rej) => {
    let Items = []
    const onNext = ({ obs, params }) => {
      setTimeout(() => {
        console.log('OBSERVABLE NEXT')
        console.log('=========== accumlated size: ' + Items.length)

        docClient.query(params, function(err, data) {
          if (err){
            console.log(err, err.stack); // an error occurred
            obs.error(err)
          }else{
            // console.log(data);           // successful response
            Items = Items.concat(data.Items)
            if (data.LastEvaluatedKey) {
              params.ExclusiveStartKey = data.LastEvaluatedKey
              obs.next({
                obs,
                params
              })
            } else {
              obs.complete(data)
            }
          }
        })
      }, 1500)
    }
    Rx.Observable.create((obs) => {
      obs.next({
        obs,
        params
      })
    }).subscribe({
      next: onNext,
      error: (err) => {
        console.log('OBSERVABLE ERROR')
        console.log(err)
      },
      complete: (y) => {
        console.log('OBSERVABLE COMPLETE')
        console.log(Items.length)
        res(Items)
      }
    })
  })
  return p
}
