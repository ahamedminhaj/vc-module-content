﻿using System;
using System.Collections.Generic;
using System.Linq;
using VirtoCommerce.ContentModule.Data.Converters;
using VirtoCommerce.ContentModule.Data.Repositories;
using VirtoCommerce.Platform.Data.Infrastructure;

namespace VirtoCommerce.ContentModule.Data.Services
{
    public class MenuServiceImpl : ServiceBase, IMenuService
    {
        private readonly Func<IMenuRepository> _menuRepositoryFactory;

        public MenuServiceImpl(Func<IMenuRepository> menuRepositoryFactory)
        {
            if (menuRepositoryFactory == null)
                throw new ArgumentNullException("menuRepositoryFactory");

            _menuRepositoryFactory = menuRepositoryFactory;
        }

        public IEnumerable<Models.MenuLinkList> GetAllLinkLists()
        {
            return _menuRepositoryFactory().GetAllLinkLists();
        }

        public IEnumerable<Models.MenuLinkList> GetListsByStoreId(string storeId)
        {
            return _menuRepositoryFactory().GetListsByStoreId(storeId);
        }

        public Models.MenuLinkList GetListById(string listId)
        {
            return _menuRepositoryFactory().GetListById(listId);
        }

        public void AddOrUpdate(Models.MenuLinkList list)
        {
            using (var repository = _menuRepositoryFactory())
            using (var changeTracker = GetChangeTracker(repository))
            {
                if (!list.IsTransient())
                {
                    var existList = repository.GetListById(list.Id);
                    if (existList != null)
                    {
                        changeTracker.Attach(existList);
                        list.Patch(existList);
                    }
                    else
                    {
                        repository.Add(list);
                    }
                }
                else
                {
                    repository.Add(list);
                }
                repository.UnitOfWork.Commit();
            }
        }

        public void DeleteList(string listId)
        {
            DeleteLists(new[] { listId });
        }

        public void DeleteLists(string[] listIds)
        {
            using (var repository = _menuRepositoryFactory())
            {
                foreach (var listId in listIds)
                {
                    var existList = repository.GetListById(listId);
                    if (existList != null)
                    {
                        repository.Remove(existList);
                    }
                }
                repository.UnitOfWork.Commit();
            }
        }


        public bool CheckList(string storeId, string name, string language, string id)
        {
            using (var repository = _menuRepositoryFactory())
            {
                var lists = repository.GetListsByStoreId(storeId);

                var retVal = !lists.Any(l => l.Name.ToLower() == name.ToLower()
                                    && (l.Language == language || (string.IsNullOrEmpty(l.Language) && string.IsNullOrEmpty(language)))
                                    && l.Id != id);

                return retVal;
            }
        }
    }
}
