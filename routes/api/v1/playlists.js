var express = require('express');
var router = express.Router();

const environment = process.env.NODE_ENV || 'development';
const configuration = require('../../../knexfile')[environment];
const database = require('knex')(configuration);

const findFavorite = require('../../../helpers/find_favorite')
const findPlaylist = require('../../../helpers/find_playlist')
const formatPlaylist = require('../../../helpers/format_playlist')

router.get('/', (req, res) => {
  database('playlists').select().then(async playlists => {
    if (playlists.length) {
      let formattedPlaylists = await playlists.map(async playlist => {
        return await formatPlaylist(playlist)
      })

      Promise.all(formattedPlaylists).then(playlists => res.status(200).json(playlists))

    } else {
      res.status(404).json({error: "No playlists currently"});
    }
  }).catch(err => res.status(404).json({error: err}))
});

router.post('/', (req, res) => {
  if (req.body.title) {
    database('playlists').insert({title: req.body.title}, '*').then(playlist => {
      res.status(200).json(playlist[0])
    }).catch(error => res.status(400).json({error: 'Title must be unique'}))
  } else {
    res.status(400).json({error: "Title not provided"});
  }
});

router.put('/:id', (req, res) => {
  database('playlists').where({id: req.params.id}).update({title: req.body.title}, '*').then(playlist => {
    if (playlist[0]) { res.status(201).send(playlist[0]) }
    else { res.status(404).json({error: "Playlist not found"}) }
  }).catch(err => res.status(404).json({error: "Playlist not found/Title is not unique"}))
});

router.delete('/:id', (req, res) => {
  database('playlists').del().where({id: req.params.id}).then(playlist => {
    if (playlist) {
      res.status(204).send();
    } else {
      res.status(404).json({error: "Playlist not found"});
    }
  }).catch(err => res.status(404).json({error: err}))
});

//playlist_favorites

router.get('/:playlist_id/favorites', async (req, res) => {
  let playlist = await findPlaylist(req.params.playlist_id)
  if (!playlist) {return res.status(404).json({error: 'Playlist not found'})}
  res.status(200).json(await formatPlaylist(playlist))
});

router.post('/:playlist_id/favorites/:fav_id', async (req, res) => {
  let playlist = await findPlaylist(req.params.playlist_id)
  if (!playlist) {return res.status(404).json({error: 'Playlist not found'})}

  let favorite = await findFavorite(req.params.fav_id)
  if (!favorite) {return res.status(404).json({error: 'Favorite not found'})}

  database('playlist_favorites').insert({playlist_id: playlist.id, favorite_id: favorite.id}).then(() => {
    res.status(201).json({Success: `${favorite.title} has been added to ${playlist.title}!`})
  }).catch(() => res.status(400).json({error: 'Cannot add same favorite multiple times'}))
})

router.delete('/:playlist_id/favorites/:fav_id', (req, res) => {
  database('playlist_favorites').del().where({playlist_id: req.params.playlist_id, favorite_id: req.params.fav_id}).then(playFav => {
    if (playFav) {return res.status(204).send()}
    else {return res.status(404).json({error: "That Playlist/Favorite relation was not found"})}
  })
})

module.exports = router;
