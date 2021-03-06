'use strict';
var bartNowApp = angular.module("bartNowApp", ['ngRoute']);

bartNowApp.config(['$routeProvider',
  function ($routeProvider) {
    $routeProvider.
      when('/stations', {
        templateUrl: 'views/stations.html',
        controller: 'StationsCtrl',
        activetab: 'stations'
      }).
      when('/trains', {
        templateUrl: 'views/trains.html',
        controller: 'TrainsCtrl',
        activetab: 'trains'
      }).
      when('/trains/:stationAbbr', {
        templateUrl: 'views/trains.html',
        controller: 'TrainsCtrl',
        activetab: 'trains'
      }).
      otherwise({
        redirectTo: '/stations'
      });
  }]);


bartNowApp.factory("GeolocationService", ['$q', '$window', '$rootScope', function ($q, $window, $rootScope) {
  return function () {
    //Credit to Rob Hurring: http://proccli.com/2013/10/angularjs-geolocation-service
    var deferred = $q.defer();

    if (!$window.navigator) {
      $rootScope.$apply(function () {
        deferred.reject(new Error("Geolocation is not supported"));
      });
    } else {
      $window.navigator.geolocation.getCurrentPosition(function (position) {
        $rootScope.$apply(function () {
          deferred.resolve(position);
        });
      }, function (error) {
        $rootScope.$apply(function () {
          deferred.reject(error);
        });
      });
    }

    return deferred.promise;
  }
}]);

bartNowApp.directive("bartMap", function () {

  //Initialize a variable to reference the Bing map control.
  var map;

  return {
    restrict: 'A', //require the bart-map "A"ttribute on the target element
    link: function (scope, elem, attrs) {

      var map = null;
      var stationPinLayer = new Microsoft.Maps.EntityCollection();

      //Create the map, and replace the initial div with it
      Microsoft.Maps.loadModule('Microsoft.Maps.Themes.BingTheme', {
        callback: function () {

          //Setup the default map options, and set your API key....
          var mapOptions = {
            credentials: "Ak1g9-jMSTR9-3eeTOkq2xFY40c4kpuyVGD52qThkBFiQFneYfHiio4FdcQ3WyWC", //get your api key from http://www.bingmapsportal.com 
            mapTypeId: Microsoft.Maps.MapTypeId.road,
            zoom: 14,
            theme: new Microsoft.Maps.Themes.BingTheme(),

            //Play with these other options if you like:
            //showDashboard: true,
            //showScalebar: false,
            //enableClickableLogo: false,
            //enableSearchLogo: false,
            //showMapTypeSelector: true,
            //showBreadcrumb: false
          };

          //Initialize the map control
          map = new Microsoft.Maps.Map(elem[0], mapOptions);

          //Add the (initially empty) stationPinLayer
          map.entities.push(stationPinLayer);
        }
      });

      //Watch for the $scope.position value to change.  If it doesn, re-center the view
      scope.$watch('position', function (value) {
        if (value.latitude && map) {
          var centerLocation = new Microsoft.Maps.Location(scope.position.latitude, scope.position.longitude);
          map.setView({ center: centerLocation });
          var pin = new Microsoft.Maps.Pushpin(centerLocation);
          map.entities.push(pin);
        }
      });

      //Watch for the $scope.stations to change.  If they do, create their pushpins
      scope.$watch('stations', function (stations) {
        if (Object.prototype.toString.call(stations) == "[object Array]" && map) {
          //Empty the collection
          stationPinLayer.clear();
          stations.forEach(function (station) {
            var stationLocation = new Microsoft.Maps.Location(station.latitude, station.longitude);
            var bartPin = {
              icon: '../images/BartPushPin_18x24.png',
              width: 18,
              height: 24
            };
            var stationPushPin = new Microsoft.Maps.Pushpin(stationLocation, bartPin);
            stationPinLayer.push(stationPushPin);
          });

        }
      });
    }
  }
});


//Create the MainCtrl Controller...
bartNowApp.controller("MainCtrl", ['$scope', '$http', '$route', 'GeolocationService', function ($scope, $http, $route, geoLocationService) {
  $scope.$route = $route;
}]);

//Create the StationsCtrl Controller...
bartNowApp.controller("StationsCtrl", ['$scope', '$http', 'GeolocationService',
  function ($scope, $http, geoLocationService) {

    $scope.stations = [];
    $scope.position = {};
    $scope.geoLocationStatus = "Determing Position....";

    $scope.getPosition = function () {
      //Get the position from our GeoLocationService
      geoLocationService().then(function(position) {
        //If we got a position back, save it to the $scope.position
        $scope.position = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        //And update the status
        $scope.geoLocationStatus = "Position Retrieved! (" + $scope.position.latitude + "," + $scope.position.longitude + ")";
        $scope.getStations(); 
      }, function(reason) {
        //otherwise, there was an error, set a random position
        $scope.position = { latitude: 37.785027, longitude: -122.406749 };
        $scope.geoLocationStatus = "Position could not be determined: " + reason + " Using Fake Position! (" + $scope.position.latitude + "," + $scope.position.longitude + ")";
      });
    };

    $scope.getStations = function () {
      // var stationsUrl = 'http://localhost:8080/v1/stations?lat=' + $scope.position.latitude + '&lon=' + $scope.position.longitude;
      var stationsUrl = 'https://mybartapi.herokuapp.com/v1/stations?lat=' + $scope.position.latitude + '&lon=' + $scope.position.longitude;

      $http.get(stationsUrl).success(function (result) {
        $scope.stations = result;
      });
    };

    //Call getStation() to get stations before map is loaded.x
    //Call getPositiion() to get the current position. 
    //getPosition() then calls getStation() to retrieve stations by proximity
    $scope.getStations();
    $scope.getPosition();

  }]);

//Create the Trains Controller...
bartNowApp.controller("TrainsCtrl", ['$scope', '$http', '$routeParams', function ($scope, $http, $routeParams) {

  $scope.stationAbbr = $routeParams.stationAbbr;
  $scope.station;

  $scope.getStations = function () {
    // var stationsUrl = 'http://localhost:8080/v1/etd/' + $scope.stationAbbr;
    var stationsUrl = 'https://mybartapi.herokuapp.com/v1/etd/' + $scope.stationAbbr;

    //Go get all the stations from the data source
    $http.get(stationsUrl).success(function (result) {
      //If you call a service, and get a single station back just set the station to the result
      console.log('###', result);
      $scope.station = result;
    });
  }

  $scope.getStations();

}]);

