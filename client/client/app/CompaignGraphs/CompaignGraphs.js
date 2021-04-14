'use strict';

angular.module('colorAdminApp')
    .config(['$stateProvider', '$urlRouterProvider', '$locationProvider', function ($stateProvider, $urlRouterProvider, $locationProvider) {
        // stream routes start
        $stateProvider

            .state('app.CompaignGraphs', {
                url: '/CompaignGraphs',
                template: '<div ui-view></div>',
                abstract: true
            })
            .state('app.CompaignGraphs.topgen', {
                url: '/topgen',
                templateUrl: 'app/CompaignGraphs/views/topgenres.html',
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

            .state('app.CompaignGraphs.topcontents', {
                url: '/topcontents',
                templateUrl: 'app/CompaignGraphs/views/topcontents.html',
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
            .state('app.CompaignGraphs.dailysummarys', {
                url: '/dailysummarys',
                templateUrl: 'app/CompaignGraphs/views/dailysummarys.html',
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
            .state('app.CompaignGraphs.compaignswise', {
                url: '/compaignswise',
                templateUrl: 'app/CompaignGraphs/views/compaignwise.html',
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
            .state('app.CompaignGraphs.hostwisesummarys', {
                url: '/hostwisesummarys',
                templateUrl: 'app/CompaignGraphs/views/hostwisesummarys.html',
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
            .state('app.CompaignGraphs.topfood&beverages', {
                url: '/topfoods',
                templateUrl: 'app/CompaignGraphs/views/topfoods.html',
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

            .state('app.CompaignGraphs.timezones', {
                url: '/timezones',
                templateUrl: 'app/CompaignGraphs/views/timezones.html',
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

            .state('app.CompaignGraphs.toplocations', {
                url: '/destinationwises',
                templateUrl: 'app/CompaignGraphs/views/destinationwises.html',
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
