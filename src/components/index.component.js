import React, { Component } from 'react';
import axios from 'axios';
import TableRow from './TableRow';
import { getIsLogined } from '../Helper/reactUtil';

export default class Index extends Component {

  constructor(props) {
      super(props);

      if(!getIsLogined())
      {
        props.history.push("/");
      }

      this.state = {business: []};
    }

    updateList = () =>{
      axios
      .get('http://localhost:4000/business')
      .then(response => {
        this.setState({ business: response.data });
      })
      .catch(error => {
        console.log(error);
      })
    }

    componentDidMount(){
     this.updateList();
    }
    
    tabRow(){
      return this.state.business.map((object, i) => {
          return <TableRow obj={object} onUpdateList={this.updateList} key={i} />;
      });
    }

    render() {
      return (
        <div>
          <h3 align="center">Business List</h3>
          <table className="table table-striped" style={{ marginTop: 20 }}>
            <thead>
              <tr>
                <th>Person</th>
                <th>Business</th>
                <th>GST Number</th>
                <th colSpan="2">Action</th>
              </tr>
            </thead>
            <tbody>
              { this.tabRow() }
            </tbody>
          </table>
        </div>
      );
    }
  }