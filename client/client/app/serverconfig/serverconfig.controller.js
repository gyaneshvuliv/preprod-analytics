colorAdminApp.controller('editServerConfigController', function ($scope, $state, $http, $location) {
    $http.get('/api/serverconfig/get/details').then(function (success) {
        $scope.data = success.data;
    });
    $scope.save = function () {
        var parameter = {
            a: $scope.data[0].conf_value,
            b: $scope.data[1].conf_value,
            c: $scope.data[2].conf_value,
            d: $scope.data[3].conf_value,
            e: $scope.data[4].conf_value,
            f: $scope.data[5].conf_value,
        }
        $http.post('/api/serverconfig/save', parameter).then(function (success) {
            $scope.data = success;
            if ($scope.data.status == 200) {
                $location.path('/success');
            } else {
                $location.path('/error');
            }
        });
            
    };
});
