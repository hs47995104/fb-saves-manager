import React, { createContext, useState, useContext, useCallback } from 'react';

const SelectionContext = createContext();

export const useSelection = () => {
  const context = useContext(SelectionContext);
  if (!context) {
    throw new Error('useSelection must be used within a SelectionProvider');
  }
  return context;
};

export const SelectionProvider = ({ children }) => {
  const [selectedItems, setSelectedItems] = useState(new Map());
  const [selectionMode, setSelectionMode] = useState(false);

  const toggleItem = useCallback((itemKey, itemData) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      if (newMap.has(itemKey)) {
        newMap.delete(itemKey);
        if (newMap.size === 0) {
          setSelectionMode(false);
        }
      } else {
        newMap.set(itemKey, itemData);
        setSelectionMode(true);
      }
      return newMap;
    });
  }, []);

  const selectAll = useCallback((items) => {
    const newMap = new Map();
    items.forEach((item, index) => {
      const itemKey = `${item.parentFbid || item.parentId}-${item.saveIndex || index}`;
      newMap.set(itemKey, item);
    });
    setSelectedItems(newMap);
    setSelectionMode(newMap.size > 0);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedItems(new Map());
    setSelectionMode(false);
  }, []);

  const removeItem = useCallback((itemKey) => {
    setSelectedItems(prev => {
      const newMap = new Map(prev);
      newMap.delete(itemKey);
      if (newMap.size === 0) {
        setSelectionMode(false);
      }
      return newMap;
    });
  }, []);

  const getSelectedItemsList = useCallback(() => {
    return Array.from(selectedItems.values());
  }, [selectedItems]);

  const getSelectedCount = useCallback(() => {
    return selectedItems.size;
  }, [selectedItems]);

  const isSelected = useCallback((itemKey) => selectedItems.has(itemKey), [selectedItems]);

  const value = {
    selectedItems,
    selectionMode,
    toggleItem,
    selectAll,
    clearSelection,
    removeItem,
    getSelectedItemsList,
    getSelectedCount,
    isSelected
  };

  return (
    <SelectionContext.Provider value={value}>
      {children}
    </SelectionContext.Provider>
  );
};

export default SelectionContext;