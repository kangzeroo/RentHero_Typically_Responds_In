const bodyParser = require('body-parser')
// routes
const Test = require('./routes/test_routes')
const Landlord = require('./routes/landlord_routes')

// bodyParser attempts to parse any request into JSON format
const json_encoding = bodyParser.json({type:'*/*'})
const originCheck = require('./auth/originCheck').originCheck
// bodyParser attempts to parse any request into GraphQL format
// const graphql_encoding = bodyParser.text({ type: 'application/graphql' })

module.exports = function(app){

	// routes
	app.get('/test', json_encoding, Test.test)

	// last active
	app.post('/update_last_active', [json_encoding, originCheck], Landlord.update_last_active)
}
