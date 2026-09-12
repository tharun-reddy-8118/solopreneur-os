import { createClient, cacheExchange, fetchExchange } from 'urql';

const graphqlUrl = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8000/graphql';

const client = createClient({
  url: graphqlUrl,
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
