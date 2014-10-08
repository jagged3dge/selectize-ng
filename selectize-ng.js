
angular.module('selectize-ng', [])
  .directive('selectize', function() {
    'use strict';

    return {
      restrict: 'A',
      require: 'ngModel',
      scope: {
        selectize: '&',
        options: '&',
        defaults: '&'
      },
      link: function(scope, element, attrs, ngModel) {

        var changing, runOnce, options, defaultValues, selectize, invalidValues = [];

        runOnce = false;

        // Default options
        options = angular.extend({
          delimiter: ',',
          persist: true,
          mode: (element[0].tagName === 'SELECT') ? 'single' : 'multi'
        }, scope.selectize() || {});

        // Activate the widget
        selectize = element.selectize(options)[0].selectize;

        selectize.on('change', function() {
          setModelValue(selectize.getValue());
        });

        // Default Values
        defaultValues = function (fn) {
          var values = fn();

          if (values instanceof Array) {
            values.forEach (function (value) {
              selectize.addItem(value);
            });
          }
        };

        function setModelValue(value) {
          if (changing) {
            return;
          }
          scope.$parent.$apply(function() {
            ngModel.$setViewValue(value);
          });

          if (options.mode === 'single') {
            selectize.blur();
          }
        }

        // Normalize the model value to an array
        function parseValues(value) {
          if (angular.isArray(value)) {
            return value;
          }
          if ( ! value) {
            return [];
          }
          return String(value).split(options.delimiter);
        }

        // Non-strict indexOf
        function indexOfLike(arr, val) {
          for (var i=0; i < arr.length; i++) {
            if (arr[i] == val) {
              return i;
            }
          }
          return -1;
        }

        // Boolean wrapper to indexOfLike
        function contains(arr, val) {
          return indexOfLike(arr, val) !== -1;
        }

        // Store invalid items for late-loading options
        function storeInvalidValues(values, resultValues) {
          values.map(function(val) {
            if ( ! (contains(resultValues, val) || contains(invalidValues, val))) {
              invalidValues.push(val);
            }
          });
        }

        function restoreInvalidValues(newOptions, values) {
          var i, index;
          for (i=0; i < newOptions.length; i++) {
            index = indexOfLike(invalidValues, newOptions[i][selectize.settings.valueField]);
            if (index !== -1) {
              values.push(newOptions[i][selectize.settings.valueField]);
              invalidValues.splice(index, 1);
            }
          }
        }

        function setSelectizeValue(value) {
          var values = parseValues(value);
          if (changing || values === parseValues(selectize.getValue())) {
            return;
          }
          changing = true;
          setTimeout(function() {
            selectize.setValue(values);
            changing = false;
            storeInvalidValues(values, parseValues(selectize.getValue()));
          });
        }

        function setSelectizeOptions(newOptions) {

          if (!newOptions) { return; }
          var values;

          if (attrs.defaults && !runOnce) {
            changing = false;
            values = parseValues(scope.defaults());
            runOnce = !runOnce;
          } else if (!attrs.defaults) {
            values = parseValues(ngModel.$viewValue);
          }

          selectize.addOption(newOptions);
          selectize.refreshOptions(false);
          if (options.mode === 'multi' && newOptions && values) {
            restoreInvalidValues(newOptions, values);
          }
          setSelectizeValue(values);
        }

        scope.$parent.$watch(attrs.ngModel, setSelectizeValue);

        if (attrs.options) {
          scope.$parent.$watchCollection(attrs.options, setSelectizeOptions);
        }

        // if (attrs.defaults) {
        //   scope.$parent.$watchCollection(attrs.defaults, setDefaultValues);
        // }

        scope.$on('$destroy', function() {
          selectize.destroy();
        });
      }
    };
  });
