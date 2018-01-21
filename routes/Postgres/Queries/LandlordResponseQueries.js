const Promise = require('bluebird')
const { promisify } = Promise
const pool = require('../db_connect')
const uuid = require('uuid')

// to run a query we just pass it to the pool
// after we're done nothing has to be taken care of
// we don't have to return any client to the pool or close a connection

const query = promisify(pool.query)

// stringify_rows: Convert each row into a string
const stringify_rows = res => res.rows.map(row => JSON.stringify(row))

const json_rows = res => res.map(row => JSON.parse(row))

//log_through: log each row
const log_through = data => {
  // console.log(data)
  return data
}

exports.grab_all_landlord_ids = (req, res, next) => {
  const get_ids = `SELECT corporation_id FROM corporation`

  const return_rows = (rows) => {
    res.json(rows)
  }

  query(get_ids)
    .then((data) => {
      return stringify_rows(data)
    })
    .then((data) => {
      return json_rows(data)
    })
    .then((data) => {
      return return_rows(data)
    })
    .catch((error) => {
        res.status(500).send('Failed to get corporation_ids')
    })
}

exports.update_response_time = (req, res, next) => {
  const info = req.body
  const values = [info.corporation_id, info.avg_time]

  const update_time = `INSERT INTO corporation_response (corporation_id, avg_time)
                              VALUES ($1, $2)
                              ON CONFLICT (corporation_id)
                              DO UPDATE
                              SET avg_time = $2;
                       `

  query(update_response_time, values)
  .then((data) => {
    res.json({
      message: 'updated landlord response time'
    })
  })
  .catch((err) => {
    res.status(500).send('updated landlord response time')
  })

}

exports.update_landlord_last_active = (req, res, next) => {
  const info = req.body
  const values = [info.corporation_id, info.last_active]

  const update_last_active = `INSERT INTO corporation_response (corporation_id, last_active)
                                     VALUES ($1, $2)
                                     ON CONFLICT (corporation_id)
                                     DO UPDATE
                                     SET last_active = $2
                              `

  query(update_last_active, values)
  .then((data) => {
    res.json({
      message: 'updated last active'
    })
  })
  .catch((err) => {
    res.status(500).send('Failed to update landlord_last_active')
  })
}
