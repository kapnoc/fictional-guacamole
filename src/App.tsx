import React from 'react';
import './App.css';
import Category from './components/Category';
import {
  BrowserRouter as Router,
  Switch,
  Route,
  Link
} from "react-router-dom";

function App() {
  return (
    <div className="App">
      <Router>
        <header>
          <div>
            <nav>
              <ul>
                <li>
                  <Link to="/">Home</Link>
                </li>
                <li>
                  <Link to="/shirts">Shirts</Link>
                </li>
                <li>
                  <Link to="/jackets">Jackets</Link>
                </li>
                <li>
                  <Link to="/accessories">Accessories</Link>
                </li>
              </ul>
            </nav>
          </div>
        </header>
        <main>
          <Switch>
            <Route exact path="/accessories" render={() => <Category name="accessories" page={1} />} />
            <Route exact path="/jackets" render={() => <Category name="jackets" page={1} />} />
            <Route exact path="/shirts" render={() => <Category name="shirts" page={1} />} />
            <Route exact path="/"> </Route>
          </Switch>
        </main>
      </Router>
    </div >
  );
}

export default App;
