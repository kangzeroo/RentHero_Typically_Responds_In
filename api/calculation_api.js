const Rx = require('rxjs')

exports.groupMessagesIntoConvos = function(corporation_id, allMessages) {
  const p = new Promise((res, rej) => {
    // CONVO_ID = `${corporation_id}_${TENANT_ID}`
    const uniqueConvos = []

    // step 1: filter into array of only tenant sent messages, and add a predictable CONVO_ID
    // includes initial messages
    const listOfTenantSentMessages = allMessages.filter((msg) => {
      return msg.SENDER_ID !== corporation_id
    }).map((msg) => {
      msg.CONVO_ID = `${corporation_id}_${msg.SENDER_ID}`
      return msg
    })

    // step 2: filter into array of only landlord sent messages, and add a predictable CONVO_ID
    // includes initial messages
    const listOfCorporationSentMessages = allMessages.filter((msg) => {
      return msg.SENDER_ID === corporation_id
    }).map((msg) => {
      msg.CONVO_ID = `${corporation_id}_${msg.RECEIVER_ID}`
      return msg
    })

    // step 3: for each TENANT_ID, add it to the objectOfConvos with the key-name of TENANT_ID and key-value of []
    let objectOfConvos = {}
    listOfTenantSentMessages.forEach((msg) => {
      objectOfConvos[msg.CONVO_ID] = []
    })

    // step 4: iterate through both sets of messages and add the messages to the appropriate CONVO_ID key-value pair in objectOfConvos
    listOfTenantSentMessages.forEach((msg) => {
      objectOfConvos[msg.CONVO_ID].push(msg)
    })
    listOfCorporationSentMessages.forEach((msg) => {
      // console.log(msg.SENDER_ID)
      objectOfConvos[msg.CONVO_ID].push(msg)
    })

    // step 5: sort by DATE and return only the first 50 messages
    const sortedObjectOfConvos = Object.keys(objectOfConvos).reduce((previous, current) => {
        previous[current] = objectOfConvos[current].sort((a, b) => {
          return a.DATE - b.DATE
        }).slice(0, 50)
        return previous
    }, {})
    // step 6: return the objectOfConvos with every conversation
    res(sortedObjectOfConvos)
  })
  return p
}

exports.calculateConvoResponseTimes = function(sortedObjectOfConvos) {
  const p = new Promise((res, rej) => {
    const responseTimes = []
    // sort the messages so that we ignore any within a 60 second interval of eachother (aka filter out initial messages) and is not 2 messages sent by the same person in a row
    Object.keys(sortedObjectOfConvos).forEach((convo_id) => {
      const arrayOfTimes = sortedObjectOfConvos[convo_id].filter((msg, index) => {
        // if (index) {
        //   console.log(sortedObjectOfConvos[convo_id][index - 1].DATE / 1000 + 120, '===', msg.DATE / 1000)
        //   console.log(sortedObjectOfConvos[convo_id][index - 1].SENDER_ID, '===', msg.SENDER_ID)
        // }
        return index === 0 || (sortedObjectOfConvos[convo_id][index - 1].DATE / 1000 + 90 < msg.DATE / 1000 && sortedObjectOfConvos[convo_id][index - 1].SENDER_ID !== msg.SENDER_ID)
      }).map((msg) => {
        return msg.DATE / 1000
      })
      responseTimes.push(arrayOfTimes.slice(0,2))
    })
    console.log(responseTimes)
    // create a counter for the cumulative response times
    let cumulativeResponseSpeed = 0
    let respondedMessages = 0
    responseTimes.forEach((respondedThread) => {
      if (respondedThread.length > 1) {
        respondedMessages += 1
        cumulativeResponseSpeed += respondedThread[1] - respondedThread[0]
      } else {
        cumulativeResponseSpeed += 0
      }
    })
    console.log(`Typically responds in ${(cumulativeResponseSpeed/60/respondedMessages).toFixed(2)} minutes... aka ${(cumulativeResponseSpeed/60/60/respondedMessages).toFixed(2)} hours`)
    console.log(`Responds to ${(respondedMessages/responseTimes.length*100).toFixed(2)}% of messages`)
    if (cumulativeResponseSpeed/60/respondedMessages && respondedMessages/responseTimes.length) {
      res({
        typical_response_time: (cumulativeResponseSpeed/60/respondedMessages).toFixed(2),
        percentage_responded_to: (respondedMessages/responseTimes.length*100).toFixed(2),
      })
    } else if (cumulativeResponseSpeed/60/respondedMessages && !respondedMessages/responseTimes.length) {
      res({
        typical_response_time: (cumulativeResponseSpeed/60/respondedMessages).toFixed(2),
        percentage_responded_to: 0,
      })
    } else if (respondedMessages/responseTimes.length && !cumulativeResponseSpeed/60/respondedMessages) {
      res({
        typical_response_time: 0,
        percentage_responded_to: (respondedMessages/responseTimes.length).toFixed(2),
      })
    } else {
      res({
        typical_response_time: 0,
        percentage_responded_to: 0,
      })
    }
  })
  return p
}
