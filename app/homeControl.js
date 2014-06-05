'use strict';

var myApp = angular.module('myApp', ['ngResource'])
	.config(['$interpolateProvider', function ($interpolateProvider) {
    $interpolateProvider.startSymbol('[[');
    $interpolateProvider.endSymbol(']]');
  }]);;

myApp.controller('HomeCtrl', function ($scope, $resource, $http) {
  	
  	$scope.nome = 'Francis Luz';
  	$scope.descricao = 'Technologic live';

  	$scope.posts = [];

	$http.get('https://www.googleapis.com/plus/v1/people/107152405442983389032/activities/public?maxResults=9&key=AIzaSyAk3R-lwNSuZrojcebvKKNHRxBd5RzF6DQ').success(function(data) {
    	angular.forEach(data.items, function(post, index) {
          if (post.verb == 'post') 
           $scope.posts.push(post.object);
        });
  });

});