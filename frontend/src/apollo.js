import { createClient, cacheExchange, fetchExchange } from 'urql';

const client = createClient({
  url: 'https://solopreneuros-backend.hf.space/graphql',
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
