'use strict';

angular.module('colorAdminApp')
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
        // stream routes start
        $stateProvider

            .state('app.graphs', {
                url: '/graphs',
                template: '<div ui-view></div>',
                abstract: true
            })
            .state('app.graphs.topgenre', {
                url: '/topgenre',
                templateUrl: 'app/Graphs/views/topgenre.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })

            .state('app.graphs.topcontent', {
                url: '/topcontent',
                templateUrl: 'app/Graphs/views/topcontent.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })
            .state('app.graphs.dailysummary', {
                url: '/dailysummary',
                templateUrl: 'app/Graphs/views/dailysummary.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })
            .state('app.graphs.deswisesummary', {
                url: '/deswisesummary',
                templateUrl: 'app/Graphs/views/deswisesummary.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })
            .state('app.graphs.hostwisesummary', {
                url: '/hostwisesummary',
                templateUrl: 'app/Graphs/views/hostwisesummary.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })
            .state('app.graphs.topfood&beverage', {
                url: '/topfood',
                templateUrl: 'app/Graphs/views/topfood.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })

            .state('app.graphs.timezone', {
                url: '/timezone',
                templateUrl: 'app/Graphs/views/timezone.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })

            .state('app.graphs.toplocations', {
                url: '/destinationwise',
                templateUrl: 'app/Graphs/views/destinationwise.html',
                data: { pageTitle: 'Server' },
                resolve: {
                    service: ['$ocLazyLoad', function ($ocLazyLoad) {
                        return $ocLazyLoad.load({
                            serie: true,
                            files: [
                                'assets/plugins/DataTables/media/css/dataTables.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Buttons/css/buttons.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/FixedHeader/css/fixedHeader.bootstrap.min.css',
                                'assets/plugins/DataTables/extensions/Responsive/css/responsive.bootstrap.min.css',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker-bs3.css',
                                'assets/plugins/DataTables/media/js/jquery.dataTables.min.js',
                                'assets/plugins/DataTables/media/js/dataTables.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/FixedHeader/js/dataTables.fixedHeader.min.js',
                                'assets/plugins/DataTables/extensions/Responsive/js/dataTables.responsive.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/dataTables.buttons.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.bootstrap.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.print.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.flash.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.html5.min.js',
                                'assets/plugins/DataTables/extensions/Buttons/js/buttons.colVis.min.js',
                                'assets/plugins/bootstrap-daterangepicker/moment.js',
                                'assets/plugins/bootstrap-daterangepicker/daterangepicker.js',
                            ]
                        });
                    }]
                }
            })

        // model routes end
    }]);
