
'use strict';

angular.module('colorAdminApp')
  	.config(['$stateProvider', '$urlRouterProvider','$locationProvider',function ($stateProvider, $urlRouterProvider,$locationProvider) {

    $stateProvider
        .state('app.serverConfig', {
            url: '/serverConfig',
            templateUrl: 'app/serverconfig/serverConfig.html',
            data: { pageTitle: 'Server Config' }
        })
  }]);