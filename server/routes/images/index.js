'use strict';

var mongoose = require('mongoose'),
  schema = mongoose.Schema({
    url: { type: String, required: true },
    size: { type: String, requred: true },
    type: { type: String, required: true },
    filename: {type: String, required: true, unique: true},
    thumb: { type: String, unique: true },
    created: {type: Date}
  }),
  Image = mongoose.model('Image', schema),
  Boom = require('boom');

module.exports = function( server, aws ) {
  [{
    method: 'GET',
    path: '/images/{id?}',
    config: {
      handler: function ( request, reply ) {
        if( request.params.id ) {
          Image.findOne({
            _id: request.params.id
          }).exec( function( err, image ) {
            if( !image ) {
              reply.view('images/not-found');
            } else {
              if( request.query.type === 'json') {
                reply({image: image});
              } else {
                reply.view('images/one', {
                  image: image
                });
              }
            }
          });
        } else {
          Image.find( ).exec( function(err, images) {
            if( err ) { return reply( Boom.badRequest(err) ); }

            if( request.query.type === 'json' ) {
              reply({images: images});
            } else {
              reply.view('images/index', {
                images: images
              });
            }
          });
        }
      }
    }
  }, {
    method: ['GET','POST','PUT','DELETE'],
    path: '/api/images/{id?}',
    config: {
      handler: function( request, reply ) {
        if( request.params.id ) {
          if( request.params.id === 'key' && request.method === 'get') {
            var s3Params = {
              Bucket: 'mahrio-imagess',
              Key: request.query.filename,
              Expires: 60,
              ACL: 'public-read'
            };
            aws.getSignedUrl('putObject', s3Params, function(err, data){
              if( err ){ return reply( Boom.badRequest(err) ); }

              return reply( { signedRequest: data });
            });
          } else if( request.method === 'put' ) {
            delete request.payload.image._id;
            Image.update({_id: request.params.id}, request.payload.image, { upsert: false })
              .exec( function(err, image){
                if( err ) {
                  if( 11000 === err.code || 11001 === err.code ) {
                    return reply( Boom.badRequest("Duplicate key error index") );
                  } else {
                    return reply( Boom.badRequest(err) );
                  }
                }
                if( image && image.ok && image.nModified ) {
                  reply({updated: true});
                } else {
                  reply({updated: false});
                }
              });
          } else if (request.method === 'delete') {
            Image.remove({_id: request.params.id}).exec( function(err, image) {
              if( err ) { return reply( Boom.badRequest(err) ); }

              if( image && image.result && image.result.ok ) {
                reply({deleted: true});
              } else {
                reply({deleted: false});
              }
            });
          } else {
            reply( Boom.badRequest('method not supported') );
          }
        } else {
          if( request.method === 'post' ) {
            request.payload.image.url = 'https://mahrio-imagess.s3.amazonaws.com/';
            request.payload.image.thumb = 'https://mahrio-imagessresized.s3.amazonaws.com/';
            Image.create( request.payload.image, function ( err ) {
              if( err ) {
                if( 11000 === err.code || 11001 === err.code ) {
                  return reply( Boom.badRequest("Duplicate key error index") );
                } else {
                  return reply( Boom.badRequest(err) );
                }
              }
              reply({created: true});
            });
          } else if( request.method === 'get' ) {
            reply.view('images/ng');
          } else {
            reply( Boom.badRequest('method not supported') );
          }
        }
      }
    }
  }].forEach(function (route) { server.route(route); });
};