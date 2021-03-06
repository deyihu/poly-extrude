module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "node": true
    },
    "extends": "standard",
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly",
        "AMap": true,
        "mapboxgl": true,
        "TMap": true
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "sourceType": "module"
    },
    "rules": {
        "no-console": "off",
        "no-inner-declarations": "off",
        "semi": ["error", "always"],
        "indent": 0,
        "padded-blocks": 0,
        "space-before-function-paren": 0,
        "no-var": 1,
        "dot-notation": 0,
        "one-var": 0,
        "new-cap": 0,
        "quote-props": 0,
        "camelcase": 0,
        "wrap-iife": 0
    }
};