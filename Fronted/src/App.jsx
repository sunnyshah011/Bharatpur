import {
  Route,
  Routes,
} from "react-router-dom";

import Home from "./Pages/Home";
import Explore from "./Pages/Explore";
import Navbar from "./Component/Navbar";
import Planmytrip from "./Pages/Planmytrip";
import Aiguides from "./Pages/Aiguides";
import Mytrip from "./Pages/Mytrip";
import About from "./Pages/About";
import Placemap from "./Pages/Placemap";
import Review from "./Pages/Review";


const App = () => (
  <div>

    <Navbar />

    <Routes>

      <Route
        path="/"
        element={<Home />}
      />

      <Route
        path="/explore"
        element={<Explore />}
      />

      <Route
        path="/plan-my-trip"
        element={<Planmytrip />}
      />

      <Route
        path="/ai-guides"
        element={<Aiguides />}
      />

      <Route
        path="/my-trip"
        element={<Mytrip />}
      />

      <Route
        path="/places/:id/map"
        element={<Placemap />}
      />

      {/* Review all generated trips */}

      <Route
        path="/review"
        element={<Review />}
      />

      {/* Review one specific generated trip */}

      <Route
        path="/review/:tripId"
        element={<Review />}
      />

      <Route
        path="/about"
        element={<About />}
      />

    </Routes>

  </div>
);


export default App;