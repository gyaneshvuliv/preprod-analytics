colorAdminApp.controller('topgenreController', function ($scope, $rootScope, $state, $http) {
    /* High Pie Chart Option
    ------------------------- */
    $scope.genredateRangeSelector = 'Yesterday'
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 1);
    $scope.startDate = moment(d).format('YYYY-MM-DD').toString();
    // $scope.endDate = moment(d).format('YYYY-MM-DD').toString();
    $scope.endDate = moment(d).format('YYYY-MM-DD').toString()
    $scope.interface;
    var chart;
    var options = {
        chart: {
            type: 'pie',
            width: 960,
            height: 400,
            renderTo: 'genre-pie-chart',
            // events: {
            //     drilldown: function (e) {
            //         if (!e.seriesOptions && e.point.name != 'Other') {
            //             //GetTheDrillDownData();;
            //             chart.showLoading('Simulating Ajax ...');
            //             var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Duration', 'UU', 'Views'] }];
            //             $http.get("/api/graphs/topgenre/" + e.point.name + "?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate)
            //                 .then(function (response) {
            //                     var arr = [];
            //                     for (var i = 0; i < response.data.length; i++) {
            //                         arr.push({ name: response.data[i].title, y: response.data[i].count, x: response.data[i].uniqueviwers, z: response.data[i].views, Duration: response.data[i].count, UU: response.data[i].uniqueviwers, Views: response.data[i].views })
            //                     }
            //                     var data = {
            //                         name: e.point.name,
            //                         id: e.point.name,
            //                         data: arr,
            //                     }
            //                     chart.hideLoading();
            //                     // chart.setTitle({ text: drilldownTitle + e.point.a + "  " + e.point.name })
            //                     chart.addSeriesAsDrilldown(e.point, data);
            //                 });
            //         }
            //     },
            //     // drilldown: function(e) {
            //     //     chart.setTitle({ text: drilldownTitle + e.point.name });
            //     // },
            //     drillup: function (e) {
            //         // chart.setTitle({ text: defaultTitle });
            //     }
            // }
        },
        title: {
            text: 'Top 10 Genre ' + $scope.genredateRangeSelector
        },
        // subtitle: {
        //     text: 'Click the slices to view others details.'
        // },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    total: 0,
                    formatter: function () {
                        var pcnt = (this.y / this.total) * 100;
                        return this.point.name + ':' + Highcharts.numberFormat(pcnt) + '%';
                    }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span>',
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>{point.x}</b>Genre<br/><b>{point.y}</b> Clicks<br/>'
        },
        series: [],
        exporting: {
            enabled: true
        },
        drilldown: {
            series: [{
                name: 'Other',
                id: 'Other',
                data: []
            }]
        }
    };
    $scope.getData = function () {
        /* call ajax call to get graph data
        ------------------------- */
        $http({ url: "/api/graphs/topgenre?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;

                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        series[0].data.push({ name: data[i].genre, y: data[i].Clicks, Clicks: data[i].Clicks, drilldown: data[i].Clicks })
                        // $scope.total = $scope.total + data[i].count;
                    } 
                    // else {
                    //     pre = pre + data[i].count
                    //     uni = uni + data[i].uniqueviwers
                    //     $scope.total = $scope.total + data[i].count;
                    //     drilldownData.push({ name: data[i].genre, y: data[i].count, x: data[i].uniqueviwers, z: data[i].views, Duration: data[i].count, UU: data[i].uniqueviwers, Views: data[i].views })
                    //     if (i == data.length - 1) {
                    //         series[0].data.push({ name: 'Other', y: pre, x: uni, drilldown: 'Other' })
                    //     }
                    // }
                }
                // update Title 
                options.title.text = 'Top 10 Genre' + $scope.genredateRangeSelector
                // update the total value 
                options.plotOptions.series.dataLabels.total = $scope.total;
                // update the series data
                options.series = series;
                // update the drilldown data
                options.drilldown.series[0].data = drilldownData;
                // Create the chart
                chart = new Highcharts.Chart(options);
            }).error(function (data, status, headers, config) {
                // alert(data.success)
            });
    }
    $scope.getData()
    /* Date Range Picker
        ------------------------- */
    $('#genre-daterange').daterangepicker({
        opens: 'right',
        format: 'MM/DD/YYYY',
        separator: ' to ',
        startDate: moment().subtract(6, 'days'),
        endDate: moment(),
        minDate: '01/01/2012',
        maxDate: '12/31/2022',
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
    },
        function (start, end) {
            $scope.genredateRangeSelector = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY');
            $scope.startDate = start.format('MMMM D, YYYY');
            $scope.endDate = end.format('MMMM D, YYYY');
            $scope.$apply();
            $scope.getData();
            // $scope.summaryDataTable.clear().draw();
        });
});

colorAdminApp.controller('topcontentController', function ($scope, $rootScope, $state, $http) {
    /* High Pie Chart Option
    ------------------------- */
    $scope.genredateRangeSelector = 'Yesterday'
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 1);
    $scope.startDate = moment(d).format('YYYY-MM-DD').toString();
    // $scope.endDate = moment(d).format('YYYY-MM-DD').toString();
    $scope.endDate = moment(d).format('YYYY-MM-DD').toString()
    $scope.interface;
    var chart;
    var options = {
        chart: {
            type: 'pie',
            width: 960,
            height: 400,
            renderTo: 'content-pie-chart',
            // events: {
            //     drilldown: function (e) {
            //         if (!e.seriesOptions && e.point.name != 'Other') {
            //             //GetTheDrillDownData();;
            //             chart.showLoading('Simulating Ajax ...');
            //             var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Duration', 'UU', 'Views'] }];
            //             $http.get("/api/graphs/topgenre/" + e.point.name + "?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate)
            //                 .then(function (response) {
            //                     var arr = [];
            //                     for (var i = 0; i < response.data.length; i++) {
            //                         arr.push({ name: response.data[i].title, y: response.data[i].count, x: response.data[i].uniqueviwers, z: response.data[i].views, Duration: response.data[i].count, UU: response.data[i].uniqueviwers, Views: response.data[i].views })
            //                     }
            //                     var data = {
            //                         name: e.point.name,
            //                         id: e.point.name,
            //                         data: arr,
            //                     }
            //                     chart.hideLoading();
            //                     // chart.setTitle({ text: drilldownTitle + e.point.a + "  " + e.point.name })
            //                     chart.addSeriesAsDrilldown(e.point, data);
            //                 });
            //         }
            //     },
            //     // drilldown: function(e) {
            //     //     chart.setTitle({ text: drilldownTitle + e.point.name });
            //     // },
            //     drillup: function (e) {
            //         // chart.setTitle({ text: defaultTitle });
            //     }
            // }
        },
        title: {
            text: 'Top 10 Content ' + $scope.genredateRangeSelector
        },
        // subtitle: {
        //     text: 'Click the slices to view others details.'
        // },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    total: 0,
                    formatter: function () {
                        var pcnt = (this.y / this.total) * 100;
                        return this.point.name + ':' + Highcharts.numberFormat(pcnt) + '%';
                    }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span>',
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>{point.x}</b>Title<br/><b>{point.y}</b> Clicks<br/>'
        },
        series: [],
        exporting: {
            enabled: true
        },
        drilldown: {
            series: [{
                name: 'Other',
                id: 'Other',
                data: []
            }]
        }
    };
    $scope.getData = function () {
        /* call ajax call to get graph data
        ------------------------- */
        $http({ url: "/api/graphs/topcontent?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;

                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        series[0].data.push({ name: data[i].title, y: data[i].Clicks, Clicks: data[i].Clicks, drilldown: data[i].Clicks })
                        // $scope.total = $scope.total + data[i].count;
                    } 
                    // else {
                    //     pre = pre + data[i].count
                    //     uni = uni + data[i].uniqueviwers
                    //     $scope.total = $scope.total + data[i].count;
                    //     drilldownData.push({ name: data[i].genre, y: data[i].count, x: data[i].uniqueviwers, z: data[i].views, Duration: data[i].count, UU: data[i].uniqueviwers, Views: data[i].views })
                    //     if (i == data.length - 1) {
                    //         series[0].data.push({ name: 'Other', y: pre, x: uni, drilldown: 'Other' })
                    //     }
                    // }
                }
                // update Title 
                options.title.text = 'Top 10 Content' + $scope.genredateRangeSelector
                // update the total value 
                options.plotOptions.series.dataLabels.total = $scope.total;
                // update the series data
                options.series = series;
                // update the drilldown data
                options.drilldown.series[0].data = drilldownData;
                // Create the chart
                chart = new Highcharts.Chart(options);
            }).error(function (data, status, headers, config) {
                // alert(data.success)
            });
    }
    $scope.getData()
    /* Date Range Picker
        ------------------------- */
    $('#content-daterange').daterangepicker({
        opens: 'right',
        format: 'MM/DD/YYYY',
        separator: ' to ',
        startDate: moment().subtract(6, 'days'),
        endDate: moment(),
        minDate: '01/01/2012',
        maxDate: '12/31/2022',
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
    },
        function (start, end) {
            $scope.genredateRangeSelector = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY');
            $scope.startDate = start.format('MMMM D, YYYY');
            $scope.endDate = end.format('MMMM D, YYYY');
            $scope.$apply();
            $scope.getData();
            // $scope.summaryDataTable.clear().draw();
        });
});

colorAdminApp.controller('topfoodController', function ($scope, $rootScope, $state, $http) {
    /* High Pie Chart Option
    ------------------------- */
    $scope.genredateRangeSelector = 'Yesterday'
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 1);
    $scope.startDate = moment(d).format('YYYY-MM-DD').toString();
    // $scope.endDate = moment(d).format('YYYY-MM-DD').toString();
    $scope.endDate = moment(d).format('YYYY-MM-DD').toString()
    $scope.interface;
    var chart;
    var options = {
        chart: {
            type: 'pie',
            width: 960,
            height: 400,
            renderTo: 'food-pie-chart',
            // events: {
            //     drilldown: function (e) {
            //         if (!e.seriesOptions && e.point.name != 'Other') {
            //             //GetTheDrillDownData();;
            //             chart.showLoading('Simulating Ajax ...');
            //             var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Duration', 'UU', 'Views'] }];
            //             $http.get("/api/graphs/topgenre/" + e.point.name + "?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate)
            //                 .then(function (response) {
            //                     var arr = [];
            //                     for (var i = 0; i < response.data.length; i++) {
            //                         arr.push({ name: response.data[i].title, y: response.data[i].count, x: response.data[i].uniqueviwers, z: response.data[i].views, Duration: response.data[i].count, UU: response.data[i].uniqueviwers, Views: response.data[i].views })
            //                     }
            //                     var data = {
            //                         name: e.point.name,
            //                         id: e.point.name,
            //                         data: arr,
            //                     }
            //                     chart.hideLoading();
            //                     // chart.setTitle({ text: drilldownTitle + e.point.a + "  " + e.point.name })
            //                     chart.addSeriesAsDrilldown(e.point, data);
            //                 });
            //         }
            //     },
            //     // drilldown: function(e) {
            //     //     chart.setTitle({ text: drilldownTitle + e.point.name });
            //     // },
            //     drillup: function (e) {
            //         // chart.setTitle({ text: defaultTitle });
            //     }
            // }
        },
        title: {
            text: 'Top 10 Food&Beverages ' + $scope.genredateRangeSelector
        },
        // subtitle: {
        //     text: 'Click the slices to view others details.'
        // },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    total: 0,
                    formatter: function () {
                        var pcnt = (this.y / this.total) * 100;
                        return this.point.name + ':' + Highcharts.numberFormat(pcnt) + '%';
                    }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span>',
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>{point.x}</b>Title<br/><b>{point.y}</b> Clicks<br/>'
        },
        series: [],
        exporting: {
            enabled: true
        },
        drilldown: {
            series: [{
                name: 'Other',
                id: 'Other',
                data: []
            }]
        }
    };
    $scope.getData = function () {
        /* call ajax call to get graph data
        ------------------------- */
        $http({ url: "/api/graphs/topfood?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;

                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        series[0].data.push({ name: data[i].title, y: data[i].Clicks, Clicks: data[i].Clicks, drilldown: data[i].Clicks })
                        // $scope.total = $scope.total + data[i].count;
                    } 
                    // else {
                    //     pre = pre + data[i].count
                    //     uni = uni + data[i].uniqueviwers
                    //     $scope.total = $scope.total + data[i].count;
                    //     drilldownData.push({ name: data[i].genre, y: data[i].count, x: data[i].uniqueviwers, z: data[i].views, Duration: data[i].count, UU: data[i].uniqueviwers, Views: data[i].views })
                    //     if (i == data.length - 1) {
                    //         series[0].data.push({ name: 'Other', y: pre, x: uni, drilldown: 'Other' })
                    //     }
                    // }
                }
                // update Title 
                options.title.text = 'Top 10 Food&Beverages' + $scope.genredateRangeSelector
                // update the total value 
                options.plotOptions.series.dataLabels.total = $scope.total;
                // update the series data
                options.series = series;
                // update the drilldown data
                options.drilldown.series[0].data = drilldownData;
                // Create the chart
                chart = new Highcharts.Chart(options);
            }).error(function (data, status, headers, config) {
                // alert(data.success)
            });
    }
    $scope.getData()
    /* Date Range Picker
        ------------------------- */
    $('#food-daterange').daterangepicker({
        opens: 'right',
        format: 'MM/DD/YYYY',
        separator: ' to ',
        startDate: moment().subtract(6, 'days'),
        endDate: moment(),
        minDate: '01/01/2012',
        maxDate: '12/31/2022',
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
    },
        function (start, end) {
            $scope.genredateRangeSelector = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY');
            $scope.startDate = start.format('MMMM D, YYYY');
            $scope.endDate = end.format('MMMM D, YYYY');
            $scope.$apply();
            $scope.getData();
            // $scope.summaryDataTable.clear().draw();
        });
});

colorAdminApp.controller('timezoneController', function ($scope, $rootScope, $state, $http) {
    /* High Pie Chart Option
    ------------------------- */
    $scope.genredateRangeSelector = 'Yesterday'
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 1);
    $scope.startDate = moment(d).format('YYYY-MM-DD').toString();
    // $scope.endDate = moment(d).format('YYYY-MM-DD').toString();
    $scope.endDate = moment(d).format('YYYY-MM-DD').toString()
    $scope.interface;
    var chart;
    var options = {
        chart: {
            type: 'pie',
            width: 960,
            height: 400,
            renderTo: 'timezone-pie-chart',
            // events: {
            //     drilldown: function (e) {
            //         if (!e.seriesOptions && e.point.name != 'Other') {
            //             //GetTheDrillDownData();;
            //             chart.showLoading('Simulating Ajax ...');
            //             var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Duration', 'UU', 'Views'] }];
            //             $http.get("/api/graphs/topgenre/" + e.point.name + "?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate)
            //                 .then(function (response) {
            //                     var arr = [];
            //                     for (var i = 0; i < response.data.length; i++) {
            //                         arr.push({ name: response.data[i].title, y: response.data[i].count, x: response.data[i].uniqueviwers, z: response.data[i].views, Duration: response.data[i].count, UU: response.data[i].uniqueviwers, Views: response.data[i].views })
            //                     }
            //                     var data = {
            //                         name: e.point.name,
            //                         id: e.point.name,
            //                         data: arr,
            //                     }
            //                     chart.hideLoading();
            //                     // chart.setTitle({ text: drilldownTitle + e.point.a + "  " + e.point.name })
            //                     chart.addSeriesAsDrilldown(e.point, data);
            //                 });
            //         }
            //     },
            //     // drilldown: function(e) {
            //     //     chart.setTitle({ text: drilldownTitle + e.point.name });
            //     // },
            //     drillup: function (e) {
            //         // chart.setTitle({ text: defaultTitle });
            //     }
            // }
        },
        title: {
            text: 'timeZoneWiseWIFILogin' + $scope.genredateRangeSelector
        },
        // subtitle: {
        //     text: 'Click the slices to view others details.'
        // },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    total: 0,
                    // formatter: function () {
                    //     var pcnt = (this.y / this.total) * 100;
                    //     return this.point.name + ':' + Highcharts.numberFormat(pcnt) + '%';
                    // }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span>',
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>user: {point.y}</b> </b>'
        },
        series: [],
        exporting: {
            enabled: true
        },
        drilldown: {
            series: [{
                name: 'Other',
                id: 'Other',
                data: []
            }]
        }
    };
    $scope.getData = function () {
        /* call ajax call to get graph data
        ------------------------- */
        $http({ url: "/api/graphs/timeZoneWiseWIFILogin?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
// console.log(data)
                for (var i = 0; i < data.length; i++) {
                    if (i < 6) {
                        let date= data[i].start+' - '+data[i].end
                        series[0].data.push({ name: date, y: data[i].user })
                        // series[0].data.push({ x: data[i].start, y: data[i].end, z: data[i].user, user: data[i].user, drilldown: data[i].user })
                        // $scope.total = $scope.total + data[i].count;
                    } 
                    // else {
                    //     pre = pre + data[i].count
                    //     uni = uni + data[i].uniqueviwers
                    //     $scope.total = $scope.total + data[i].count;
                    //     drilldownData.push({ name: data[i].genre, y: data[i].count, x: data[i].uniqueviwers, z: data[i].views, Duration: data[i].count, UU: data[i].uniqueviwers, Views: data[i].views })
                    //     if (i == data.length - 1) {
                    //         series[0].data.push({ name: 'Other', y: pre, x: uni, drilldown: 'Other' })
                    //     }
                    // }
                }
                // update Title 
                options.title.text = 'timeZoneWiseWIFILogin' + $scope.genredateRangeSelector
                // update the total value 
                options.plotOptions.series.dataLabels.total = $scope.total;
                // update the series data
                options.series = series;
                // update the drilldown data
                options.drilldown.series[0].data = drilldownData;
                // Create the chart
                chart = new Highcharts.Chart(options);
            }).error(function (data, status, headers, config) {
                // alert(data.success)
            });
    }
    $scope.getData()
    /* Date Range Picker
        ------------------------- */
    $('#timezone-daterange').daterangepicker({
        opens: 'right',
        format: 'MM/DD/YYYY',
        separator: ' to ',
        startDate: moment().subtract(6, 'days'),
        endDate: moment(),
        minDate: '01/01/2012',
        maxDate: '12/31/2022',
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
    },
        function (start, end) {
            $scope.genredateRangeSelector = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY');
            $scope.startDate = start.format('MMMM D, YYYY');
            $scope.endDate = end.format('MMMM D, YYYY');
            $scope.$apply();
            $scope.getData();
            // $scope.summaryDataTable.clear().draw();
        });
});

colorAdminApp.controller('destinationwiseController', function ($scope, $rootScope, $state, $http) {
    /* High Pie Chart Option
    ------------------------- */
    $scope.genredateRangeSelector = 'Yesterday'
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 1);
    $scope.startDate = moment(d).format('YYYY-MM-DD').toString();
    // $scope.endDate = moment(d).format('YYYY-MM-DD').toString();
    $scope.endDate = moment(d).format('YYYY-MM-DD').toString()
    $scope.interface;
    var chart;
    var options = {
        chart: {
            type: 'pie',
            width: 960,
            height: 400,
            renderTo: 'destinationwise-pie-chart',
            // events: {
            //     drilldown: function (e) {
            //         if (!e.seriesOptions && e.point.name != 'Other') {
            //             //GetTheDrillDownData();;
            //             chart.showLoading('Simulating Ajax ...');
            //             var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Duration', 'UU', 'Views'] }];
            //             $http.get("/api/graphs/topgenre/" + e.point.name + "?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate)
            //                 .then(function (response) {
            //                     var arr = [];
            //                     for (var i = 0; i < response.data.length; i++) {
            //                         arr.push({ name: response.data[i].title, y: response.data[i].count, x: response.data[i].uniqueviwers, z: response.data[i].views, Duration: response.data[i].count, UU: response.data[i].uniqueviwers, Views: response.data[i].views })
            //                     }
            //                     var data = {
            //                         name: e.point.name,
            //                         id: e.point.name,
            //                         data: arr,
            //                     }
            //                     chart.hideLoading();
            //                     // chart.setTitle({ text: drilldownTitle + e.point.a + "  " + e.point.name })
            //                     chart.addSeriesAsDrilldown(e.point, data);
            //                 });
            //         }
            //     },
            //     // drilldown: function(e) {
            //     //     chart.setTitle({ text: drilldownTitle + e.point.name });
            //     // },
            //     drillup: function (e) {
            //         // chart.setTitle({ text: defaultTitle });
            //     }
            // }
        },
        title: {
            text: 'destinationWiseWIFILogin' + $scope.genredateRangeSelector
        },
        // subtitle: {
        //     text: 'Click the slices to view others details.'
        // },
        plotOptions: {
            series: {
                dataLabels: {
                    enabled: true,
                    total: 0,
                    // formatter: function () {
                    //     var pcnt = (this.y / this.total) * 100;
                    //     return this.point.name + ':' + Highcharts.numberFormat(pcnt) + '%';
                    // }
                }
            }
        },
        tooltip: {
            headerFormat: '<span style="font-size:11px">{series.name}</span>',
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>des: {point.x}</b><br/><b>user: {point.y}</b><br/>'
        },
        series: [],
        exporting: {
            enabled: true
        },
        drilldown: {
            series: [{
                name: 'Other',
                id: 'Other',
                data: []
            }]
        }
    };
    $scope.getData = function () {
        /* call ajax call to get graph data
        ------------------------- */
        $http({ url: "/api/graphs/destinationWiseWIFILogin?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
// console.log(data)
                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        series[0].data.push({ name: data[i].des, x: data[i].des, y: data[i].user })
                        // series[0].data.push({ x: data[i].des, y: data[i].user })
                        // $scope.total = $scope.total + data[i].count;
                    } 
                    // else {
                    //     pre = pre + data[i].count
                    //     uni = uni + data[i].uniqueviwers
                    //     $scope.total = $scope.total + data[i].count;
                    //     drilldownData.push({ name: data[i].genre, y: data[i].count, x: data[i].uniqueviwers, z: data[i].views, Duration: data[i].count, UU: data[i].uniqueviwers, Views: data[i].views })
                    //     if (i == data.length - 1) {
                    //         series[0].data.push({ name: 'Other', y: pre, x: uni, drilldown: 'Other' })
                    //     }
                    // }
                }
                // update Title 
                options.title.text = 'destinationWiseWIFILogin' + $scope.genredateRangeSelector
                // update the total value 
                options.plotOptions.series.dataLabels.total = $scope.total;
                // update the series data
                options.series = series;
                // update the drilldown data
                options.drilldown.series[0].data = drilldownData;
                // Create the chart
                chart = new Highcharts.Chart(options);
            }).error(function (data, status, headers, config) {
                // alert(data.success)
            });
    }
    $scope.getData()
    /* Date Range Picker
        ------------------------- */
    $('#destinationwise-daterange').daterangepicker({
        opens: 'right',
        format: 'MM/DD/YYYY',
        separator: ' to ',
        startDate: moment().subtract(6, 'days'),
        endDate: moment(),
        minDate: '01/01/2012',
        maxDate: '12/31/2022',
        ranges: {
            'Today': [moment(), moment()],
            'Yesterday': [moment().subtract(1, 'days'), moment().subtract(1, 'days')],
            'Last 7 Days': [moment().subtract(6, 'days'), moment()],
            'Last 30 Days': [moment().subtract(29, 'days'), moment()],
            'This Month': [moment().startOf('month'), moment().endOf('month')],
            'Last Month': [moment().subtract(1, 'month').startOf('month'), moment().subtract(1, 'month').endOf('month')]
        },
    },
        function (start, end) {
            $scope.genredateRangeSelector = start.format('MMMM D, YYYY') + ' - ' + end.format('MMMM D, YYYY');
            $scope.startDate = start.format('MMMM D, YYYY');
            $scope.endDate = end.format('MMMM D, YYYY');
            $scope.$apply();
            $scope.getData();
            // $scope.summaryDataTable.clear().draw();
        });
});
