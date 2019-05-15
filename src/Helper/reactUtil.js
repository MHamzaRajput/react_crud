
import React, { Component } from 'react';

export const getIsLogined = () => { 
    let isLogined = localStorage.getItem("isLogined") == "true" ? true : false;
    console.log("isLogined",isLogined, typeof(isLogined));
    return isLogined;
}