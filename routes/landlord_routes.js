const update_landlord_last_active = require('./Postgres/Queries/LandlordResponseQueries').update_landlord_last_active
const get_landlord_responsiveness_stats = require('./Postgres/Queries/LandlordResponseQueries').get_landlord_responsiveness_stats

exports.update_last_active = function(req, res, next) {
  const landlord_id = req.body.landlord_id
  console.log(landlord_id)
  update_landlord_last_active(landlord_id).then((data) => {
    res.json(data)
  }).catch((err) => {
    res.status(500).send(err)
  })
}

exports.get_responsiveness_stats = function(req, res, next) {
  const landlord_id = req.body.landlord_id
  console.log(landlord_id)
  get_landlord_responsiveness_stats(landlord_id).then((data) => {
    res.json(data)
  }).catch((err) => {
    res.status(500).send(err)
  })
}
