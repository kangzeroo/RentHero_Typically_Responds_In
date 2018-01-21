
/*
// HOW IT WORKS
    1. grabAllLandlords() to get an array of IDs
    2. map over processLandlordResponseTime() on each landlord and use setTimeout() with timeout of 1000ms * arrayIndex (thus 1st landlord is executed at 1s, 2nd landlord begins execution at 2s..etc)
            a. grab last 1000 messages in DynamoDB 'COMMUNICATION_LOGS' where 'SENDER_ID' or 'RECEIVER_ID' was the landlord
            b. group those messages into their own convos (use the concatenation strategy, sender_id + receiver_id = convo_id)
            c. sort each convo by date and grab the first few instances of the below. We use the first few instances because the auto-initial messages get sent to both appearing to be a reply but are not since they came from 'RentHeroSMS'
                    i. a message with 'SENDER_ID === CORPORATION_ID', and
                    ii. a message with 'RECEIVER_ID === CORPORATION_ID'
            d. for each convo, calculate the difference between the DATE of each message in part 2c (aka the response time per convo)
            e. average out the response times per convo. this is the typically_responds_in value
            f. save the typically_responds_in value to each landlord, in Postgres
    3. complete the batch job when all landlords have completed all of step 2

// IMPORTANT TO NOTICE
    - When a small landlord receives an inquiry, they get an SMS and Email appearing to come from the tenant
          - Thus when we measure response times, we can just track by the time difference in convo messages
    - When a corporate landlord receives an inquiry, they get an email only, with a link to map employee contact info. When the initial email is sent out, we include the INQUIRY_ID with COMMUNICATION_LOGS, and SENDER_ID = CORPORATION_ID
          - Thus when we measure response times, we can also track by the time difference in convo messages, since it appears that the initial message and the followup messages are in the same convo
          - But since the initial message has a SENDER_CONTACT_ID of 'RentHeroSMS', we can differentiate between regular message replies and the initial (for now, we only do initial)
*/

const grabAllLandlords = require('../routes/Postgres/Queries/LandlordResponseQueries').grabAllLandlords
const grabConvosForLandlord = require('./dynamodb_api').grabConvosForLandlord
const groupMessagesIntoConvos = require('./calculation_api').groupMessagesIntoConvos
const calculateConvoResponseTimes = require('./calculation_api').calculateConvoResponseTimes
const updateTypicalResponseTime = require('../routes/Postgres/Queries/LandlordResponseQueries').updateTypicalResponseTime


exports.runBatchJob = function(){
  console.log('===== BEGIN BATCH JOB =====')
  if (process.env.NODE_ENV === 'production') {
    initiateBatch()
    setInterval(() => {
      initiateBatch()
    }, 1000*60*60*24)
  } else {
    console.log('NODE_ENV is in development, so batch job will not be run')
  }
}

const initiateBatch = () => {
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
          return groupMessagesIntoConvos(landlord.corporation_id, allMessages)
        })
        .then((sortedObjectOfConvos) => {
          return calculateConvoResponseTimes(sortedObjectOfConvos)
        })
        .then((responseStats) => {
          return updateTypicalResponseTime(landlord.corporation_id, responseStats)
        })
        .then((result) => {
          // console.log(result)
          res(result)
        })
        .catch((err) => {
          console.log(err)
          rej(err)
        })
    }, arrayIndex*5000)
  })
  return p
}
