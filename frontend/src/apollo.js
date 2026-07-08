import { createClient, cacheExchange, fetchExchange } from 'urql';

const client = createClient({
  url: 'http://127.0.0.1:8000/graphql',
  exchanges: [cacheExchange, fetchExchange],
  fetchOptions: () => {
    const token = localStorage.getItem('token');
    return {
      method: 'POST',
      headers: { authorization: token ? `Bearer ${token}` : '' },
    };
  },
});

export default client;
