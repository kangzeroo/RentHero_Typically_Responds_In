
/*
// HOW IT WORKS
    1. grabAllLandlords() to get an array of IDs
    2. map over processLandlordResponseTime() on each landlord and use setTimeout() with timeout of 1000ms * arrayIndex (thus 1st landlord is executed at 1s, 2nd landlord begins execution at 2s..etc)
            a. grab last 1000 messages in DynamoDB 'COMMUNICATION_LOGS' where 'SENDER_ID' or 'RECEIVER_ID' was the landlord
            b. group those messages into their own convos (use the concatenation strategy, sender_id + receiver_id = convo_id)
            c. sort each convo by date and grab the first instance of:
                    i. a message with 'SENDER_ID === CORPORATION_ID', and
                    ii. a message with 'RECEIVER_ID === CORPORATION_ID'
            d. for each convo, calculate the difference between the DATE of each message in part 2c (aka the response time per convo)
            e. average out the response times per convo. this is the typically_responds_in value
            f. save the typically_responds_in value to each landlord, in Postgres
    3. complete the batch job when all landlords have completed all of step 2
*/

const grabAllLandlords = require('api/postgres_api').grabAllLandlords
const grabConvosForLandlord = require('api/dynamodb_api').grabConvosForLandlord
const groupMessagesIntoConvos = require('api/calculation_api').groupMessagesIntoConvos
const calculateConvoResponseTimes = require('api/calculation_api').calculateConvoResponseTimes
const calculateTypicalResponseTime = require('api/calculation_api').calculateTypicalResponseTime
const updateTypicalResponseTime = require('api/postgres_api').updateTypicalResponseTime


const runBatchJob = () => {
  console.log('===== BEGIN BATCH JOB =====')

  grabAllLandlords()
    .then((landlords) => {
      const landlordArray = landlords.map((landlord, arrayIndex) => {
        return processLandlordResponseTime(landlord, arrayIndex)
      })
      return Promise.all(landlordArray)
    })
    .then((allDone) => {
      console.log(allDone)
      console.log('===== END BATCH JOB =====')
    })
    .catch((err) => {
      console.log(err)
    })
}

const processLandlordResponseTime = (landlord, arrayIndex) => {
  const p = new Promise((res, rej) => {
    setTimeout(() => {
      grabConvosForLandlord(landlord.corporation_id)
        .then((allMessages) => {
          return groupMessagesIntoConvos(allMessages)
        })
        .then((convos) => {
          return calculateConvoResponseTimes(convos)
        })
        .then((convoResponseTimes) => {
          return calculateTypicalResponseTime(convoResponseTimes)
        })
        .then((avgTime) => {
          return updateTypicalResponseTime(landlord.corporation_id, avgTime)
        })
        .then((result) => {
          console.log(result)
          res(result)
        })
        .catch((err) => {
          console.log(err)
          rej(err)
        })
    }, arrayIndex*10000)
  })
  return p
}
