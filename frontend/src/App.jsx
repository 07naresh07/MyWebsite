// src/App.jsx
import { Routes, Route } from "react-router-dom";

import Navbar from "./components/Navbar.jsx";

import Home from "./pages/Home.jsx";
import About from "./pages/About.jsx";
import Projects from "./pages/Projects.jsx";
import ProjectsAdd from "./pages/ProjectsAdd.jsx";
import Blog from "./pages/Blog.jsx";
import BlogPost from "./pages/BlogPost.jsx";
import BlogEdit from "./pages/BlogEdit.jsx";
import Contact from "./pages/Contact.jsx";
import Experience from "./pages/Experience.jsx";
import ExperienceAdd from "./pages/ExperienceAdd.jsx";
import Education from "./pages/Education.jsx";
import EducationAdd from "./pages/EducationAdd.jsx";
import Certificates from "./pages/Certificates.jsx";
import CertificatesAdd from "./pages/CertificatesAdd.jsx";

// BIM pages
import BIM from "./pages/BIM.jsx";                 // Editor (create/edit)
import BIMDisplay from "./pages/BIMDisplay.jsx";   // List/Display

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-6 lg:px-8 py-8">{children}</main>
    </>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        {/* Core */}
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />

        {/* Projects */}
        <Route path="/projects" element={<Projects />} />
        <Route path="/projects/new" element={<ProjectsAdd />} />
        <Route path="/projects/edit/:id" element={<ProjectsAdd />} />

        {/* Education */}
        <Route path="/education" element={<Education />} />
        <Route path="/education/new" element={<EducationAdd />} />
        <Route path="/education/edit/:id" element={<EducationAdd />} />

        {/* Experience */}
        <Route path="/experience" element={<Experience />} />
        <Route path="/experience/new" element={<ExperienceAdd />} />
        <Route path="/experience/edit/:id" element={<ExperienceAdd />} />

        {/* Blog */}
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/blog/edit/new" element={<BlogEdit />} />
        <Route path="/blog/edit/:id" element={<BlogEdit />} />

        {/* Certificates */}
        <Route path="/certificates" element={<Certificates />} />
        <Route path="/certificates/new" element={<CertificatesAdd />} />
        <Route path="/certificates/edit/:id" element={<CertificatesAdd />} />

        {/* Contact */}
        <Route path="/contact" element={<Contact />} />

        {/* BIM */}
        <Route path="/bim" element={<BIMDisplay />} />             {/* list */}
        <Route path="/bim/new" element={<BIM />} />                {/* create */}
        <Route path="/bim/edit/:id" element={<BIM />} />           {/* edit */}

        {/* Fallback */}
        <Route path="*" element={<Home />} />
      </Routes>
    </Layout>
  );
}
