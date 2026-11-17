// frontend/src/pages/_app.js
import '../styles/globals.css';
import { SWRConfig } from 'swr';
import axios from 'axios';

const fetcher = url => axios.get(url).then(res => res.data);

export default function MyApp({ Component, pageProps }) {
  return (
    <SWRConfig value={{ fetcher, dedupingInterval: 60000 }}>
      <Component {...pageProps} />
    </SWRConfig>
  );
}
