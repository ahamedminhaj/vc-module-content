﻿angular.module('virtoCommerce.contentModule')
.controller('virtoCommerce.contentModule.menuLinkListController', ['$rootScope', '$scope', 'virtoCommerce.contentModule.menus', 'virtoCommerce.storeModule.stores', 'platformWebApp.bladeNavigationService', 'platformWebApp.dialogService', 'virtoCommerce.contentModule.menuLinkList-associationTypesService', 'uiGridConstants', 'platformWebApp.uiGridHelper',
 function ($rootScope, $scope, menus, menusStores, bladeNavigationService, dialogService, associationTypesService, uiGridConstants, uiGridHelper) {
     var blade = $scope.blade;
     blade.updatePermission = 'content:update';
     $scope.uiGridConstants = uiGridConstants;

     blade.initialize = function () {
         menusStores.get({ id: blade.chosenStoreId }, function (data) {
             blade.languages = data.languages;

             if (blade.newList) {
                 blade.currentEntity = { title: undefined, storeId: blade.chosenStoreId, menuLinks: [] };
                 blade.chosenListId = blade.currentEntity.id;
                 blade.toolbarCommands = [{
                     name: "content.commands.add-link", icon: 'fa fa-plus',
                     executeMethod: function () {
                         var newEntity = { url: undefined, title: undefined, type: undefined, priority: 0, isActive: false, language: undefined, menuLinkListId: blade.chosenListId };
                         blade.currentEntity.menuLinks.push(newEntity);
                         blade.recalculatePriority();
                     },
                     canExecuteMethod: function () { return true; },
                     permission: blade.updatePermission
                 },
                 {
                     name: "content.commands.save-list", icon: 'fa fa-save',
                     executeMethod: blade.saveChanges,
                     canExecuteMethod: canSave,
                     permission: blade.updatePermission
                 }];

                 blade.isLoading = false;
             }
             else {
                 blade.isLoading = true;
                 menus.getList({ storeId: blade.chosenStoreId, listId: blade.chosenListId }, function (data) {
                     _.each(data.menuLinks, function (x) {
                         if (x.associatedObjectType) {
                             x.associatedObject = _.findWhere($scope.associatedObjectTypes, { id: x.associatedObjectType });
                         }
                     });
                     data.menuLinks = _.sortBy(data.menuLinks, 'priority').reverse();
                     blade.origEntity = data;
                     blade.currentEntity = angular.copy(data);
                     blade.isLoading = false;

                     blade.toolbarCommands = [{
                         name: "platform.commands.save", icon: 'fa fa-save',
                         executeMethod: blade.saveChanges,
                         canExecuteMethod: canSave,
                         permission: blade.updatePermission
                     },
                     {
                         name: "platform.commands.reset", icon: 'fa fa-undo',
                         executeMethod: function () {
                             angular.copy(blade.origEntity, blade.currentEntity);
                         },
                         canExecuteMethod: function () {
                             return !angular.equals(blade.origEntity, blade.currentEntity) && blade.hasUpdatePermission();
                         },
                         permission: blade.updatePermission
                     },
                     {
                         name: "content.commands.add-link", icon: 'fa fa-plus',
                         executeMethod: function () {
                             var newEntity = { url: undefined, title: undefined, isActive: true, priority: 0, menuLinkListId: blade.chosenListId };
                             blade.currentEntity.menuLinks.push(newEntity);
                             blade.recalculatePriority();
                         },
                         canExecuteMethod: function () { return true; },
                         permission: blade.updatePermission
                     },
                     {
                         name: "content.commands.delete-links", icon: 'fa fa-trash-o',
                         executeMethod: function () {
                             $scope.deleteRows($scope.gridApi.selection.getSelectedRows());
                         },
                         canExecuteMethod: function () {
                             return $scope.gridApi && _.any($scope.gridApi.selection.getSelectedRows());
                         },
                         permission: 'content:delete'
                     }];
                 },
                 function (error) { bladeNavigationService.setError('Error ' + error.status, blade); });
             }
         },
         function (error) { bladeNavigationService.setError('Error ' + error.status, blade); });
     };

     blade.saveChanges = function () {
         blade.isLoading = true;
         menus.checkList({ storeId: blade.chosenStoreId, id: blade.currentEntity.id, name: blade.currentEntity.name, language: blade.currentEntity.language }, function (data) {
             if (Boolean(data.result)) {
                 menus.update({ storeId: blade.chosenStoreId }, blade.currentEntity, function (data) {
                     blade.parentBlade.initialize();
                     blade.newList = false;
                     blade.isLoading = false;
                     blade.origEntity = angular.copy(blade.currentEntity);
                     $rootScope.$broadcast("cms-menus-changed", blade.chosenStoreId);
                 },
                 function (error) { bladeNavigationService.setError('Error ' + error.status, blade); });
             }
             else {
                 blade.isLoading = false;
                 var dialog = {
                     id: "errorInName",
                     title: "content.dialogs.name-must-unique.title",
                     message: "content.dialogs.name-must-unique.message",
                     callback: function (remove) {

                     }
                 }
                 dialogService.showNotificationDialog(dialog);
             }
         },
         function (error) { bladeNavigationService.setError('Error ' + error.status, blade); });
     };

     function isDirty() {
         return !angular.equals(blade.currentEntity, blade.origEntity) && blade.hasUpdatePermission();
     }

     function canSave() {
         var listNameIsRight = !((angular.isUndefined(blade.currentEntity.name)) || (blade.currentEntity.name === null));
         var linksAreRight = _.all(blade.currentEntity.menuLinks, function (x) {
             return x.title && x.url && (!x.associatedObjectType || x.associatedObjectId);
         });
         return isDirty() && listNameIsRight && linksAreRight && _.any(blade.currentEntity.menuLinks);
     }

     $scope.deleteRows = function (rows) {
         //var dialog = {
         //    id: "confirmDelete",
         //    title: "content.dialogs.links-delete.title",
         //    message: "content.dialogs.links-delete.message",
         //    callback: function (remove) {
         //        if (remove) {
         _.each(rows, function (row) {
             blade.currentEntity.menuLinks.splice(blade.currentEntity.menuLinks.indexOf(row), 1);
         });
         //        }
         //    }
         //}
         //dialogService.showConfirmationDialog(dialog);
     };

     blade.onClose = function (closeCallback) {
         bladeNavigationService.showConfirmationIfNeeded(isDirty(), canSave(), blade, blade.saveChanges, closeCallback, "content.dialogs.link-list-save.title", "content.dialogs.link-list-save.message");
     };

     blade.recalculatePriority = function () {
         for (var i = 0; i < blade.currentEntity.menuLinks.length; i++) {
             blade.currentEntity.menuLinks[i].priority = (blade.currentEntity.menuLinks.length - 1 - i) * 10;
         }
     };

     blade.headIcon = 'fa-archive';

     // ui-grid
     $scope.setGridOptions = function (gridOptions) {
         uiGridHelper.initialize($scope, gridOptions,
         function (gridApi) {
             gridApi.draggableRows.on.rowFinishDrag($scope, blade.recalculatePriority);
         });
     };

     $scope.associatedObjectTypes = associationTypesService.objects;
     blade.initialize();
 }]);