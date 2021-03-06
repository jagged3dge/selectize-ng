
angular.module('selectize-ng', [])
.directive('selectize', function() {
  'use strict';

  return {
    restrict: 'A',
    require: 'ngModel',
    scope: {
      selectize: '&',
      options: '&',
      defaults: '&',
      selecteditems: '=',
      ngDisabled: '=',
      ngRequired: '&'
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

      ngModel.$isEmpty = function (val) {
        return (val === undefined || val === null || !val.length); //override to support checking empty arrays
      };

      function toggle (disabled) {
        disabled ? selectize.disable() : selectize.enable();
      };

      function validate() {
        var isInvalid = (scope.ngRequired() || attrs.required || (attrs.options && attrs.options.required)) && ngModel.$isEmpty(scope.ngModel);
        ngModel.$setValidity('required', !isInvalid)
      };

      function setModelValue(value) {
        if (changing) {
          if (attrs.selecteditems) {
            var selected = [];
            var values = parseValues(value);
            angular.forEach(values, function (i) {
              selected.push(selectize.options[i]);
            })
            scope.$apply (function() {
              scope.selecteditems = selected;
            })
          }
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
        if (!value) {
          setTimeout(function() {
            selectize.clear();
            return;
          });
        };
        var values = parseValues(value);
        if (changing || values === parseValues(selectize.getValue())) {
          return;
        }
        changing = true;
        if (options.mode === 'single' && value) {
          setTimeout(function() {
            selectize.setValue(value);
            changing = false;
          });
        }
        else if (options.mode === 'multi' && value) {
          setTimeout(function() {
            selectize.setValue(values);
            changing = false;
            storeInvalidValues(values, parseValues(selectize.getValue()));
          });
        }

        validate();

        selectize.$control.toggleClass('ng-valid', ngModel.$valid);
        selectize.$control.toggleClass('ng-invalid', ngModel.$invalid);
        selectize.$control.toggleClass('ng-dirty', ngModel.$dirty);
        selectize.$control.toggleClass('ng-pristine', ngModel.$pristine);

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

      scope.$on('$destroy', function() {
        selectize.destroy();
      });
    }
  };
});
