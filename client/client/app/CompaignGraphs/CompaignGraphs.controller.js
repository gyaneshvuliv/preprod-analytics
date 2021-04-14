colorAdminApp.controller('topgenresController', function ($scope, $rootScope, $state, $http) {
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
            renderTo: 'genres-pie-chart',
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
        $scope.showme = true;
        $http({ url: "/api/CompaignGraphs/topgenres?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
                $scope.showme = false;

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
    $('#genres-daterange').daterangepicker({
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

colorAdminApp.controller('topcontentsController', function ($scope, $rootScope, $state, $http) {
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
            renderTo: 'contents-pie-chart',
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
        $scope.showme = true;
        $http({ url: "/api/CompaignGraphs/topcontents?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
                $scope.showme = false;

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
    $('#contents-daterange').daterangepicker({
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

colorAdminApp.controller('topfoodsController', function ($scope, $rootScope, $state, $http) {
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
            renderTo: 'foods-pie-chart',
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
        $scope.showme = true;
        $http({ url: "/api/CompaignGraphs/topfoods?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
                $scope.showme = false;

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
    $('#foods-daterange').daterangepicker({
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

colorAdminApp.controller('timezonesController', function ($scope, $rootScope, $state, $http) {
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
            renderTo: 'timezones-pie-chart',
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
            text: 'timeZoneWiseWIFILogins' + $scope.genredateRangeSelector
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
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>{point.x}</b>time<br/><b>{point.y}</b> user<br/>'
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
        $scope.showme = true;
        $http({ url: "/api/CompaignGraphs/timeZoneWiseWIFILogins?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
                $scope.showme = false;
                // console.log(data)
                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        let date = data[i].start + ' - ' + data[i].end
                        series[0].data.push({ name: data[i].time, x: data[i].time, y: data[i].user })
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
                options.title.text = 'timeZoneWiseWIFILogins' + $scope.genredateRangeSelector
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
    $('#timezones-daterange').daterangepicker({
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

colorAdminApp.controller('destinationwisesController', function ($scope, $rootScope, $state, $http) {
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
            renderTo: 'destinationwises-pie-chart',
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
            text: 'Top 10 Locations' + $scope.genredateRangeSelector
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
            pointFormat: '<span style="color:{point.color}"> {point.name}</span>: <br/> <b>{point.x}</b>destination<br/><b>{point.y}</b> user<br/>'
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
        $scope.showme = true;
        $http({ url: "/api/CompaignGraphs/destinationWiseUsers?startDate=" + $scope.startDate + "&endDate=" + $scope.endDate, method: "GET" })
            .success(function (data, status, headers, config) {
                var series = [{ name: 'Summary', colorByPoint: true, data: [], keys: ['Clicks'] }];
                var drilldownData = [];
                var pre = 0;
                var uni = 0;
                $scope.total = 0;
                $scope.showme = false;
                // console.log(data)
                for (var i = 0; i < data.length; i++) {
                    if (i < 10) {
                        series[0].data.push({ name: data[i].destination, x: data[i].destination, y: data[i].user })
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
                options.title.text = 'Top 10 Locations' + $scope.genredateRangeSelector
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
    $('#destinationwises-daterange').daterangepicker({
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

colorAdminApp.controller('compaignswiseController', function ($scope, $rootScope, $state, Auth, $location, $cookieStore, blackbox, $http) {
    $scope.versions = [
        { version: '1.0.3' }, { version: '1.1.0' }, { version: '1.2.0' }, { version: '1.2.1' },
        { version: '1.3.0' }, { version: '1.3.1' }, { version: '1.3.2' }, { version: '1.3.3' },
        { version: '1.3.4' }, { version: '1.3.5' }, { version: '2.0.0' }, { version: '2.0.3' },
        { version: '2.1.0' }, { version: '2.1.1' }, { version: '2.2.0' }, { version: '2.3.0' },
        { version: '2.3.1' }, { version: '2.3.2' }, { version: '2.3.3' }, { version: '2.9.0' },
        { version: '3.0.0' }, { version: '3.0.1' }, { version: '3.0.2' }, { version: '4.0.0' },
        { version: '4.0.1' }, { version: '4.0.2' }, { version: '4.1.0' }, { version: '4.1.1' },
        { version: '4.1.2' }, { version: '5.0.0' }
    ]
    var currentDate = new Date();
    var d = new Date();
    d.setDate(d.getDate() - 6);
    var startdate = moment(d).format('YYYY-MM-DD').toString() //d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate();
    var enddate = moment(currentDate).format('YYYY-MM-DD').toString();  //currentDate.getFullYear()+'-'+(currentDate.getMonth()+1)+'-'+currentDate.getDate();
    function loadChartData(data) {
        console.log(data)
        var day = []
        var categories = [];
        var users = [];
        var clicks = [];
        var Totalpdfdownload = [];
        var Totalpdfuser = [];

        var datecat = []
        $scope.users_count = 0;
        $scope.clicks_count = 0;
        $scope.Totalpdfdownload_count = 0;
        $scope.Totalpdfuser_count = 0;

        console.log(data);
        for (var i = 0; i < data[0].length; i++) {
            // console.log(data[1]);
            $scope.users_count += data[0][i].users
            users.push(parseInt(data[0][i].users))
            categories.push(moment(data[0][i].date).format('DD MMM'));
            datecat.push(data[0][i].date);
            day.push(moment(data[0][i].date).format('ddd'))
        }
        for (var j = 0; j < datecat.length; j++) {
            var exist = false;
            for (var x = 0; x < data[1].length; x++) {
                if (datecat[j] == data[1][x].date) {
                    $scope.clicks_count += data[1][x].clicks
                    clicks.push(parseInt(data[1][x].clicks))
                    exist = true;
                }
            };
            if (exist == false) {
                $scope.clicks_count += 0
                clicks.push(0)
            };

        };
        for (var y = 0; y < datecat.length; y++) {
            var exist = false;
            for (var k = 0; k < data[2].length; k++) {
                if (datecat[y] == data[2][k].date) {
                    $scope.Totalpdfdownload_count += data[2][k].Totalpdfdownload
                    Totalpdfdownload.push(parseInt(data[2][k].Totalpdfdownload))
                    exist = true;
                }
            };
            if (exist == false) {
                $scope.Totalpdfdownload_count += 0
                Totalpdfdownload.push(0)
            };

        };

        for (var z = 0; z < datecat.length; z++) {
            var exist = false;
            for (var m = 0; m < data[3].length; m++) {
                if (datecat[z] == data[3][m].date) {
                    $scope.Totalpdfuser_count += data[3][m].Totalpdfuser
                    Totalpdfuser.push(parseInt(data[3][m].Totalpdfuser))
                    exist = true;
                }
            };
            if (exist == false) {
                $scope.Totalpdfuser_count += 0
                Totalpdfuser.push(0)
            };

        };
        
        $scope.cat_first_value = categories[0]
        var chart = new Highcharts.Chart({
            chart: {
                type: 'line',
                renderTo: 'mvp-day-bar',
                events: { load: function () { setTimeout(swapCats, 10000); } },
                width: 960,
                height: 400
            },
            title: {
                text: '',
                //x: -20 //center
            },
            /*subtitle: {
                text: 'Source: WorldClimate.com',
                x: -20
            },*/
            xAxis: {
                categories: categories
            },
            yAxis: {
                title: {
                    text: 'Values'
                },
                plotLines: [{
                    value: 0,
                    width: 1,
                    color: '#808080'
                }]
            },
            tooltip: {
                valueSuffix: ''
            },
            legend: {
                enabled: true,
                layout: 'horizontal',
                align: 'center',
                verticalAlign: 'bottom',
                borderWidth: 0
            },
            plotOptions: {
                series: {
                    dataLabels: {
                        enabled: true,
                        formatter: function () {
                            if (this.y != 0) {
                                return this.y;
                            } else {
                                return null;
                            }
                        },
                        borderRadius: 4,
                        backgroundColor: 'rgba(252, 255, 197, 0.7)',
                        borderWidth: 1,
                        borderColor: '#AAA',
                        y: -10
                    }
                }
            },
            series: [
                {
                    name: 'Users',
                    data: users
                },
                {
                    name: 'Clicks',
                    data: clicks
                },
                {
                    name: 'PdfDownloads',
                    data: Totalpdfdownload
                },
                {
                    name: 'PdfUsers',
                    data: Totalpdfuser
                }
            ]
        });
        // function to swap category
        function swapCats() {
            if (chart.xAxis[0].categories[0] == $scope.cat_first_value) {
                chart.xAxis[0].update({ categories: day }, true);
            } else {
                chart.xAxis[0].update({ categories: categories }, true);
            }
            setTimeout(swapCats, 10000);

        }
    }
    $scope.getData = function () {
        $scope.TotalHomepagelogin_count = 0;
        $scope.interface1;
        $scope.showme = true;
        console.log($scope.destination)
        console.log($scope.daysfilter)
        var url = "/api/CompaignGraphs/compaignswise_summarys?interface='" + $scope.interface1 + "'&startDate=" + startdate + "&endDate=" + enddate + "&daysfilter=" + $scope.daysfilter + "&version=" + $scope.version + "&title=" + $scope.title;
        $http.get(url)
            .then(function (response) {
                $scope.isLoading = false;
                console.log(response.data)
                if (response.data.length == 0) {
                    $scope.select = "No record found."
                    loadChartData([]);
                    $scope.showme = false;
                } else {
                    loadChartData(response.data);
                    $scope.showme = false;
                }

            });
    };
    $scope.mvpdateSelector = 'Last 7 Days'
    $('#mvpbardaywise').daterangepicker(
        {
            ranges: {
                'Today': [moment(), moment()],
                'Yesterday': [moment().subtract('days', 1), moment().subtract('days', 1)],
                // 'Last 3 Days': [moment().subtract('days', 2), moment()],
                'Last 7 Days': [moment().subtract('days', 6), moment()],
                'Last 30 Days': [moment().subtract('days', 29), moment()],
                'This Month': [moment().startOf('month'), moment().endOf('month')],
                'Last Month': [moment().subtract('month', 1).startOf('month'), moment().subtract('month', 1).endOf('month')]
            },
            startDate: moment().subtract('days', 6),
            endDate: moment()
        },
        //Filter data by date selected
        function (start, end, dateSelector) {
            $scope.mvpdateSelector = dateSelector;
            if (dateSelector == 'Custom Range') { $scope.mvpdateSelector = dateSelector + ' ' + moment(new Date(start)).format('YYYY-MM-DD') + ' to ' + moment(new Date(end)).format('YYYY-MM-DD') };
            //startdate = new Date(start._d).getTime(); //start.format('YYYY-MM-DD').toString();
            //enddate = new Date(end._d).getTime(); // end.format('YYYY-MM-DD').toString();
            startdate = start.format('YYYY-MM-DD').toString();
            enddate = end.format('YYYY-MM-DD').toString();
            $scope.getData();
        });
    $scope.getData();
});
