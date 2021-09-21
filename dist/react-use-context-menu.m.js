import { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';

const getMenuPosition = (rect, [x, y]) => {
  const menuStyles = {
    top: y,
    left: x
  };
  const {
    innerWidth,
    innerHeight
  } = window;

  if (y + rect.height > innerHeight) {
    menuStyles.top -= rect.height;
  }

  if (x + rect.width > innerWidth) {
    menuStyles.left -= rect.width;
  }

  if (menuStyles.top < 0) {
    menuStyles.top = rect.height < innerHeight ? (innerHeight - rect.height) / 2 : 0;
  }

  if (menuStyles.left < 0) {
    menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
  }

  return menuStyles;
};
const getRTLMenuPosition = (rect, [x, y]) => {
  const menuStyles = {
    top: y,
    left: x
  };
  const {
    innerWidth,
    innerHeight
  } = window;
  menuStyles.left = x - rect.width;

  if (y + rect.height > innerHeight) {
    menuStyles.top -= rect.height;
  }

  if (menuStyles.left < 0) {
    menuStyles.left += rect.width;
  }

  if (menuStyles.top < 0) {
    menuStyles.top = rect.height < innerHeight ? (innerHeight - rect.height) / 2 : 0;
  }

  if (menuStyles.left + rect.width > innerWidth) {
    menuStyles.left = rect.width < innerWidth ? (innerWidth - rect.width) / 2 : 0;
  }

  return menuStyles;
};
const getCoords = (event, config) => ["X", "Y"].map(axis => (event[`client${axis}`] || event.touches && event.touches[0][`page${axis}`]) - config[`pos${axis}`]);

const MOUSE_BUTTON = {
  LEFT: 0,
  RIGHT: 2
};
const defaultConfig = {
  disable: false,
  holdToDisplay: 1000,
  posX: 0,
  posY: 0,
  mouseButton: MOUSE_BUTTON.RIGHT,
  disableIfShiftIsPressed: false,

  collect() {}

};
function buildUseContextMenuTrigger(triggerVisible) {
  return _config => {
    const config = Object.assign({}, defaultConfig, _config);
    const touchHandled = useRef(false);
    const mouseDownTimeoutId = useRef();
    const touchstartTimeoutId = useRef();

    const handleContextClick = event => {
      if (config.disable) return;
      if (config.disableIfShiftIsPressed && event.shiftKey) return;
      event.preventDefault();
      event.stopPropagation();
      triggerVisible(getCoords(event, config), config.collect());
    };

    const handleMouseDown = event => {
      if (config.holdToDisplay >= 0 && event.button === MOUSE_BUTTON.LEFT) {
        event.persist();
        mouseDownTimeoutId.current = setTimeout(() => handleContextClick(event), config.holdToDisplay);
      }
    };

    const handleMouseUp = event => {
      if (event.button === MOUSE_BUTTON.LEFT) {
        clearTimeout(mouseDownTimeoutId.current);
      }
    };

    const handleMouseOut = event => {
      if (event.button === MOUSE_BUTTON.LEFT) {
        clearTimeout(mouseDownTimeoutId.current);
      }
    };

    const handleTouchstart = event => {
      touchHandled.current = false;

      if (config.holdToDisplay >= 0) {
        event.persist();
        event.stopPropagation();
        touchstartTimeoutId.current = setTimeout(() => {
          handleContextClick(event);
          touchHandled.current = true;
        }, config.holdToDisplay);
      }
    };

    const handleTouchEnd = event => {
      if (touchHandled.current) {
        event.preventDefault();
      }

      clearTimeout(touchstartTimeoutId.current);
    };

    const handleContextMenu = event => {
      if (event.button === config.mouseButton) {
        handleContextClick(event);
      }
    };

    const handleMouseClick = event => {
      if (event.button === config.mouseButton) {
        handleContextClick(event);
      }
    };

    const triggerBind = {
      onContextMenu: handleContextMenu,
      onClick: handleMouseClick,
      onMouseDown: handleMouseDown,
      onMouseUp: handleMouseUp,
      onTouchStart: handleTouchstart,
      onTouchEnd: handleTouchEnd,
      onMouseOut: handleMouseOut
    };
    return [triggerBind];
  };
}

const keyCodes = {
  ESCAPE: 27,
  ENTER: 13,
  UP_ARROW: 38,
  DOWN_ARROW: 40
};
const baseStyles = {
  position: "fixed",
  opacity: 0,
  pointerEvents: "none"
};

const focusElement = el => el.focus();

const useContextMenu = ({
  rtl,
  handleElementSelect = focusElement
} = {}) => {
  const menuRef = useRef();
  const selectables = useRef([]);
  const [style, setStyles] = useState(baseStyles);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [isVisible, setVisible] = useState(false);
  const [coords, setCoords] = useState([0, 0]);
  const [collectedData, setCollectedData] = useState();
  const hideMenu = useCallback(() => setVisible(false), [setVisible]);
  const triggerVisible = useCallback((coords, data) => {
    setVisible(true);
    setCoords(coords);
    setCollectedData(data);
  }, [setVisible, setCollectedData]);

  const markSelectable = el => selectables.current = el === null ? [] : [...selectables.current, el];

  useEffect(() => {
    const handleOutsideClick = e => {
      if (!menuRef.current.contains(e.target)) {
        setSelectedIndex(-1);
        hideMenu();
      }
    };

    const handleKeyNavigation = e => {
      switch (e.keyCode) {
        case keyCodes.ESCAPE:
          e.preventDefault();
          hideMenu();
          break;

        case keyCodes.UP_ARROW:
          e.preventDefault();

          if (selectedIndex > 0) {
            setSelectedIndex(s => s - 1);
            handleElementSelect(selectables.current[selectedIndex - 1]);
          }

          break;

        case keyCodes.DOWN_ARROW:
          e.preventDefault();

          if (selectedIndex + 1 < selectables.current.length) {
            setSelectedIndex(s => s + 1);
            handleElementSelect(selectables.current[selectedIndex + 1]);
          }

          break;

        case keyCodes.ENTER:
          if (selectedIndex !== -1) {
            selectables.current[selectedIndex].click();
          }

          hideMenu();
          break;
      }
    };

    if (isVisible) {
      document.addEventListener("mousedown", handleOutsideClick);
      document.addEventListener("touchstart", handleOutsideClick);
      document.addEventListener("scroll", hideMenu);
      document.addEventListener("contextmenu", hideMenu);
      document.addEventListener("keydown", handleKeyNavigation);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
      document.removeEventListener("touchstart", handleOutsideClick);
      document.removeEventListener("scroll", hideMenu);
      document.removeEventListener("contextmenu", hideMenu);
      document.removeEventListener("keydown", handleKeyNavigation);
    };
  }, [menuRef, hideMenu, selectedIndex, setSelectedIndex, selectables, handleElementSelect, isVisible]);
  useLayoutEffect(() => {
    if (isVisible) {
      const rect = menuRef.current.getBoundingClientRect();
      const {
        top,
        left
      } = rtl ? getRTLMenuPosition(rect, coords) : getMenuPosition(rect, coords);
      setStyles(st => ({ ...st,
        top: `${top}px`,
        left: `${left}px`,
        opacity: 1,
        pointerEvents: "auto"
      }));
    } else {
      setStyles(baseStyles);
    }
  }, [menuRef, isVisible, coords]);
  const bindMenu = {
    style,
    ref: menuRef,
    role: "menu",
    tabIndex: -1
  };
  const bindMenuItems = {
    ref: markSelectable,
    role: "menuitem",
    tabIndex: -1
  };
  return [bindMenu, bindMenuItems, buildUseContextMenuTrigger(triggerVisible), {
    data: collectedData,
    isVisible,
    setVisible,
    coords,
    setCoords
  }];
};

export default useContextMenu;
