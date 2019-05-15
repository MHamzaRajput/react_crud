import React, { Component } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import { BrowserRouter as Router, Switch, Route, Link } from 'react-router-dom';

import Create from './components/create.component';
import Edit from './components/edit.component';
import Index from './components/index.component';
import Login from './components/login.component';
import { getIsLogined } from './Helper/reactUtil';
import validatePath from './components/validatePath.component';

class App extends Component {

  constructor(props){
    super(props);

    this.state = {
      isLogined: getIsLogined()
    }

    console.log("After : ",this.state);
    console.log("App.constructor()");
  }



  updateIsLogined = ( isLogined ) => {
    this.setState({
      isLogined:isLogined
    });

    localStorage.setItem("isLogined",isLogined);
  }

  render() {
    return (
      <Router>
        <div className="container">
          <nav className="navbar navbar-expand-lg navbar-light bg-light">
            <Link to="" className="navbar-brand">React CRUD Example</Link>
            <div className="collapse navbar-collapse" id="navbarSupportedContent">
              <ul className="navbar-nav mr-auto">
              <li className="m-2">
                  <Link to={'/'} className={(!this.state.isLogined)? "btn btn-info" : "btn btn-info disabled" }>Login</Link>
              </li>
              <li className="m-2">
                <Link to={'/create'} className={(this.state.isLogined)? "btn btn-info" : "btn btn-info disabled" }>Create</Link>
              </li>
              <li className="m-2">
                <Link to={'/index'} className={(this.state.isLogined)? "btn btn-info" : "btn btn-info disabled" }>Index</Link>
              </li>
              <li className="m-2">
                <Link to={'/'} className={(this.state.isLogined)? "btn btn-danger" : "btn btn-danger disabled" } onClick={()=> this.updateIsLogined(false)}>Logout</Link>
              </li>
              </ul>
            </div>
          </nav>
          <Switch>
              <Route exact 
                     path='/' 
                     render={(props) => <Login {...props} logined={this.updateIsLogined} 
                                                          isLogined={this.state.isLogined} /> } />
              <Route exact 
                     path='/create' 
                     render={(props) => <Create {...props} isLogined={this.state.isLogined} /> }  />
              <Route path='/index' 
                     render={(props) => <Index {...props} isLogined={this.state.isLogined} /> }  />
              <Route path='/edit/:id' 
                     render={(props) => <Edit {...props} isLogined={this.state.isLogined} /> }  />
              <Route component={validatePath} />
          </Switch>

        </div>
      </Router>
    );
  }
}

export default App;
