'use strict';

angular.module('Images', ['ngRoute','textAngular'])
  .config( function($routeProvider) {
    $routeProvider
      .when('/', {
        templateUrl : '/assets/ng/images/list.html'
      })
      .when('/new',{
        templateUrl: '/assets/ng/images/new.html'
      })
      .when('/:id', {
        templateUrl : '/assets/ng/images/show.html'
      })
      .when('/:id/edit', {
        templateUrl : '/assets/ng/images/edit.html'
      })
      .otherwise({
        redirectTo: '/'
      });
  })
  .run(['$rootScope', '$location', function($rootScope, $location){
    $rootScope.goTo = function( path ){
      $location.path( path );
    };
  }])
  .controller('AppCtrl', [function(){
    var that = this;
  }])
  .controller('ListCtrl', ['$http', '$window', function($http, $window){
    var that = this;

    $http.get('/images?type=json')
      .then( function(res){
        that.images = res.data.images;
      });

    that.delete = function( id, index ) {
      var isDelete = $window.confirm('Are you sure?');
      if( isDelete ) {
        $http.delete('/api/images/' + id)
          .then( function(res){
            that.images.splice(index, 1);
          });
      }
    };
  }])
  .controller('NewCtrl', ['$rootScope', '$http', function( $rootScope, $http ){
    var that = this;

    that.image = {};

    that.submitImage = function(){
      $http.get('/api/images/key?filename='+that.image.name)
        .then( function(res){
          $http({
            url: res.data.signedRequest,
            method: 'PUT',
            data: that.image,
            transformRequest: angular.identity,
            headers: { 'x-amz-acl': 'public-read', 'Authorization': undefined, 'Content-Type': undefined }
          }).then( function( ){
            var img = { type: that.image.type, filename: that.image.name, size: that.image.size };
            $http.post('/api/images', {image: img})
              .then( function(res){
                $rootScope.goTo( '/' );
              })
          });
        });
    };
  }])
  .controller('ShowCtrl', ['$http','$routeParams', function($http, $routeParams){
    var that = this;

    $http.get('/images/'+ $routeParams.id + '?type=json' )
      .then( function(res){
        that.image = res.data.image;
      }, function(){

      });
  }])
  .controller('EditCtrl', ['$rootScope', '$http','$routeParams', function($rootScope, $http, $routeParams){
    var that = this;

    $http.get('/images/' + $routeParams.id + '?type=json' )
      .then( function(res){
        that.image = res.data.image;
      });

    that.submitImage = function(){
      $http.put('/api/images/'+that.image._id, {image: that.image})
        .then( function(res){
          $rootScope.goTo( '/' );
        }, function(err){
          console.log(err);
        })
    };
  }])
  .directive('imageForm', [function(){
    return {
      restrict: 'E',
      templateUrl: '/assets/ng/images/_form.html',
      scope: {
        vm: '='
      },
      link: function( scope, el ){
        angular.element( document ).find('input#inputFile').bind( 'change', function(event){
          scope.vm.image = event.target.files[0];
        })
      }
    };
  }]);