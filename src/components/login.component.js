import React, { Component } from 'react';
import { getIsLogined } from '../Helper/reactUtil';


export default class Login extends Component {
    constructor(props) {
        super(props);

        console.log("Login.isLogined", props.isLogined, typeof(props.isLogined));
        
        if(getIsLogined())
        {
           console.log("going to /index");
           props.history.push("/index");
        }

        this.state = {
            email: '',
            password: ''
        }

    }

    doLogin = () => {
        
        this.props.logined(true);
        this.setState({
            email: "",
            password: ""
        })
        this.props.history.push("/index");
    }

    onChangePassword = (e) => {
        this.setState({
            password: e.target.value
        })
    }

    onChangeEmail = (e) => {
        this.setState({
            email: e.target.value
        })
    }


    render() {

    
    return(
        <React.Fragment>
            <div className="">       
                <form className="form-signin col-lg-4 justify-content-md-center">
                    <div className="text-center mb-4">

                        <img className="mb-4" 
                             src="/docs/4.3/assets/brand/bootstrap-solid.svg" 
                             alt="" 
                             width="72" 
                             height="72"/>

                        <h1 className="h3 mb-3 font-weight-normal">Please Sign In</h1>
                
                    </div>

                    <div className="form-label-group">
                        <label htmlFor="inputEmail">Email address</label>
                       
                        <input type="email" 
                               id="inputEmail" 
                               className="form-control" 
                               placeholder="Email address" 
                               value={this.state.email}
                               onChange={this.onChangeEmail}
                               required="" 
                               autoFocus=""/>
                    </div>

                    <div className="form-label-group">
                        <label htmlFor="inputPassword">Password</label>
                        <input  type="password" 
                                id="inputPassword" 
                                className="form-control" 
                                placeholder="Password" 
                                value={this.state.password}
                                onChange={this.onChangePassword}
                                required=""/>
                
                    </div>

                    <div className="checkbox mb-3">
                        <label>
                        <input type="checkbox" value="remember-me"/> Remember me
                        </label>
                    </div>
                    <button className="btn btn-lg btn-primary btn-block" 
                            type="button" 
                            onClick={this.doLogin} > Sign in</button>
                    <p className="mt-5 mb-3 text-muted text-center">© 2017-2019</p>
                </form>
            </div>

        </React.Fragment>
    );
 }
}
