import { openEmailLink } from "../lib/utils.js";

export default function Footer() {
  const email = "ndhami74@gmail.com";
  return (
    <footer className="border-t border-gray-200 bg-white">
      <div className="container py-6 text-sm text-gray-600 flex items-center justify-between">
        <div>© {new Date().getFullYear()} Naresh Singh Dhami</div>
        <div className="flex gap-4">
          <a
            href="#"
            onClick={(e) => openEmailLink(e, email)}
            className="hover:underline"
          >
            Email
          </a>
          <a
            className="hover:underline"
            target="_blank"
            rel="noreferrer"
            href="https://www.linkedin.com/in/naresh-singh-dhami-461bb8132/"
          >
            LinkedIn
          </a>
          <a
            className="hover:underline"
            target="_blank"
            rel="noreferrer"
            href="https://github.com/07naresh07"
          >
            GitHub
          </a>
        </div>
      </div>
    </footer>
  );
}
