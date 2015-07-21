Parse.initialize("0HCUh6LvopdYVtTKiNnWpvpISGzownaAgXW6rVIo", "LJJHYIxW1CeP7ujWkTObFjicnKKFhqnhqSGvr0u2");

var app = angular.module('aerolineafsi', ['ngMaterial', 'ngRoute', 'parse-angular']);

app.config(function($routeProvider) {
    $routeProvider
    .when('/', {
        templateUrl : 'views/index.html',
        controller  : 'indexController',
        requireLogin : false,
        title : 'Inicia sesión'
    })
    .when('/flights', {
        templateUrl : 'views/flight.html',
        controller  : 'flightController',
        requireLogin : true,
        title : 'Lista de Vuelos'
    })
    .when('/addFlight', {
        templateUrl : 'views/add.html',
        controller  : 'addFlightController',
        requireLogin : true,
        title : 'Crear Vuelo'
    })
    .otherwise({
        redirectTo:'/'
    });
});

app.run(['$location', '$rootScope', '$http', function($location, $rootScope, $http) {
    $rootScope.$on('$routeChangeStart', function (event, current, previous) {
        $rootScope.title = current.$$route.title;
        if(Parse.User.current()){
            if($location.path() == '/'){
                $location.path('/flights');
            }
        }else{
            $location.path('/');
        }
    });
}]);

app.controller('navbarController',['$scope', '$location', '$http', '$mdDialog', function($scope, $location, $http, $mdDialog){
    $scope.isActive = function(path){
        return $location.path() == path;
    };
    $scope.visible = function(){
        return $location.path() != '/';
    };
    $scope.flights = function(){
        return $location.path('/flights');
    };
    $scope.addFlight = function(){
        return $location.path('/addFlight');
    };
    $scope.logout = function(){
        Parse.User.logOut();
        $location.path('/');
        $scope.showAlert('Has cerrado sesión exitosamente');
    }
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);


app.controller('indexController', ['$rootScope', '$http', '$scope', '$mdDialog', '$location', function($rootScope, $http, $scope, $mdDialog, $location) {
    $scope.login = function() {
        Parse.User.logIn($scope.user.username, $scope.user.password, {
            success: function(user) {
                if(user.get("rol") != 1){
                    Parse.User.logOut();
                    $scope.showAlert('No tienes permisos para acceder a esta aplicación');
                }else{
                    $location.path('/flights');
                }
            },
            error: function(user, error) {
                $scope.showAlert('Datos de acceso incorrectos');
            }
        });
    };
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);

app.controller('flightController', ['$scope', '$http', function($scope, $http){
    var flight = Parse.Object.extend("Flight");
    var query = new Parse.Query(flight);
    query.include("airplane");
    query.include("destination");
    query.include("origin");
    query.find({
        success: function(results) {
            $scope.flights = [];
            for(var i = 0; i < results.length; i++){
                $scope.flights.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);

app.controller('addFlightController', ['$http', '$scope', '$mdDialog', '$location', function($http, $scope, $mdDialog, $location) {
    var airport = Parse.Object.extend("Airport");
    var airplane = Parse.Object.extend("Airplane");
    var airportQuery = new Parse.Query(airport);
    var airplaneQuery = new Parse.Query(airplane);
    airportQuery.find({
        success: function(results) {
            $scope.airports = [];
            for(var i = 0; i < results.length; i++){
                $scope.airports.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    airplaneQuery.find({
        success: function(results) {
            $scope.airplanes = [];
            for(var i = 0; i < results.length; i++){
                $scope.airplanes.push(results[i]);
            }
        },
        error: function(error) {
            $scope.showAlert(error.message);
        }
    });
    $scope.filter = function(text){
        var results = text ? $scope.airports.filter( filterText(text) ) : $scope.airports, deferred;
        return results;
    };
    function filterText(query) {
        var lowercaseQuery = angular.lowercase(query);
        return function filterFn(airport) {
            var lower = angular.lowercase(airport.get("iata"))+'-'+angular.lowercase(airport.get("city"));
            return (lower.indexOf(lowercaseQuery) !== -1);
        };
    };

    $scope.searchTextChange = function(text) {}
    $scope.selectedItemChange = function(item) {}
    $scope.submit = function(){
        if($scope.origin == undefined){
            $scope.showAlert('Debe seleccionar una ciudad de origen');
            return;
        }
        if($scope.destination == undefined){
            $scope.showAlert('Debe seleccionar una ciudad de destino');
            return;
        }
        if($scope.origin === $scope.destination){
            $scope.showAlert('Las ciudades de origen y destino deben ser diferentes');
            return;
        }        
        $scope.departureTime.setDate($scope.date.getDate());
        $scope.departureTime.setMonth($scope.date.getMonth());
        $scope.departureTime.setFullYear($scope.date.getFullYear());
        $scope.arrivalTime.setDate($scope.date.getDate());
        $scope.arrivalTime.setMonth($scope.date.getMonth());
        $scope.arrivalTime.setFullYear($scope.date.getFullYear());
        if($scope.departureTime.getTime() > $scope.arrivalTime.getTime()){            
            $scope.showAlert('La hora de llegada debe ser superior a la hora de salida');
            return;
        }

        var Flight = Parse.Object.extend("Flight");
        var flight = new Flight();
        flight.set("origin", $scope.origin);
        flight.set("destination", $scope.destination);
        flight.set("airplane", $scope.airplanes[0]);
        flight.set("departureDate", $scope.departureTime);
        flight.set("arrivalDate", $scope.arrivalTime);
        flight.set("price", $scope.price);
        flight.save(null, {
          success: function(flight) {
            $location.path('/flights');
            $scope.showAlert('Vuelo creado exitosamente con código: ' + flight.id);
        },
        error: function(flight, error) {
            $scope.showAlert(error.message);
        }
    });
    };
    $scope.showAlert = function(message) {
        $mdDialog.show(
            $mdDialog.alert()
            .parent(angular.element(document.body))
            .content(message)
            .ok('Cerrar')
            );
    };
}]);