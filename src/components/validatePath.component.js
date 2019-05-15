import React, { Component } from 'react'
import { getIsLogined } from '../Helper/reactUtil';

export default class validatePath extends Component {

    constructor(props)
    {
        super(props);
        if(getIsLogined())
        {
           props.history.push("/index");
        }
        else
        {
           props.history.push("/");
        }
    }

    render() {

    return (
      <div></div>
    )
  }
}
