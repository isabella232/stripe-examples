import React from 'react';
import {graphql} from 'react-apollo';
import gql from 'graphql-tag';
import moment from 'moment';
import idx from 'idx';
import gravatar from 'gravatar';
import LoadingSpinner from './LoadingSpinner';
import {Button, Container, Row, Col, Card, CardBody} from 'reactstrap';

const query = gql`
  query StripeCustomersQuery($cursor: String, $limit: Int) {
    stripeCustomers(after: $cursor, limit: $limit) {
      edges {
        node {
          id
          email
          created
          account_balance
          delinquent
          default_source
          livemode
          description
          subscriptions {
            data {
              id
              status
              items {
                total_count
                data {
                  id
                  plan {
                    id
                    name
                    currency
                  }
                }
              }
            }
            total_count
          }
          discount {
            end
            subscription
          }
        }
      }
      pageInfo {
        endCursor
        hasNextPage
      }
    }
  }
`;

class StripeCustomer extends React.Component {
  render() {
    const {customer} = this.props;
    const subscription = idx(customer, _ => _.subscriptions.data[0]);
    const plan = idx(subscription, _ => _.items.data[0].plan);
    console.log({plan});
    return (
      <div class="project">
        <div class="row bg-white has-shadow">
          <div class="left-col col-lg-6 d-flex align-items-center justify-content-between">
            <div class="project-title d-flex align-items-center">
              <div class="image has-shadow">
                <img
                  src={gravatar.url(customer.email, {d: 'retro'})}
                  alt="customer logo"
                  class="img-fluid "
                />
              </div>
              <div class="text">
                <h3 class="h4">{customer.email}</h3>
                <small
                  style={{
                    textOverflow: 'ellipses',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                  }}>
                  {customer.description}
                </small>
              </div>
            </div>
          </div>
          <div class="right-col col-lg-6 d-flex align-items-center">
            <div class="text">
              <div>Created {moment(customer.created * 1000).fromNow()}</div>
              <div>
                {' '}
                {!plan
                  ? 'No plan'
                  : plan.name + ' plan (' + subscription.status + ')'}
              </div>
            </div>
          </div>
        </div>
      </div>
      /*       <Card>
        <CardBody>
          <div>
            <img
              alt="customer logo"
              src={gravatar.url(customer.email, {d: 'retro'})}
            />
          </div>
          <div>
            <div>{customer.email}</div>
            <div>Joined {moment(customer.created * 1000).fromNow()}</div>
            {customer.delinquent ? <div>Delinquent!</div> : null}
            <div>
              {!plan
                ? 'No plan'
                : plan.name + ' plan (' + subscription.status + ')'}
            </div>
          </div>
        </CardBody>
      </Card>
 */
    );
  }
}

class StripeCustomers extends React.Component {
  state = {loadingMore: false};
  _loadMore = () => {
    this.setState({loadingMore: true});
    this.props.data
      .loadMoreEntries()
      .then(() => this.setState({loadingMore: false}))
      .catch(() => this.setState({loadingMore: false}));
  };

  render() {
    console.log(this.props.data);
    if (this.props.data.loading) {
      return <LoadingSpinner />;
    }
    if (this.props.data.error) {
      // XXX: better errors
      return <div>Error :( {this.props.data.error.message}</div>;
    }
    return (
      <div class="page">
        <section>
          <div class="container-fluid">
            {this.props.data.stripeCustomers.edges.map(s => (
              <StripeCustomer key={s.node.id} customer={s.node} />
            ))}

            {this.props.data.stripeCustomers.pageInfo.hasNextPage ? (
              this.state.loadingMore ? (
                <LoadingSpinner />
              ) : (
                <Button
                  color="info"
                  onClick={this._loadMore}
                  disabled={this.state.loadingMore}>
                  Load More
                </Button>
              )
            ) : null}
          </div>
        </section>
      </div>
    );
  }
}

const StripeCustomersWithData = graphql(query, {
  options: {variables: {limit: 2, cursor: null}},
  props({data: {loading, stripeCustomers, fetchMore, variables}}) {
    return {
      data: {
        loading,
        stripeCustomers,
        loadMoreEntries: () => {
          const cursor = stripeCustomers.pageInfo.endCursor;
          return fetchMore({
            query,
            variables: {
              limit: 2,
              cursor,
            },
            updateQuery: (previousResult, {fetchMoreResult, variables}) => {
              const newEdges = fetchMoreResult.stripeCustomers.edges;
              const lastEdge =
                previousResult.stripeCustomers.edges[
                  previousResult.stripeCustomers.edges.length - 1
                ];
              if (lastEdge.node.id !== cursor) {
                console.error(
                  'bad pagination query, throwing away results',
                  lastEdge.node.id,
                  cursor,
                );
                return previousResult;
              }
              return newEdges.length
                ? {
                    // Put the new comments at the end of the list and update `pageInfo`
                    // so we have the new `endCursor` and `hasNextPage` values
                    ...fetchMoreResult,
                    stripeCustomers: {
                      ...fetchMoreResult.stripeCustomers,
                      edges: [
                        ...previousResult.stripeCustomers.edges,
                        ...newEdges,
                      ],
                    },
                  }
                : previousResult;
            },
          });
        },
      },
    };
  },
})(StripeCustomers);

export default StripeCustomersWithData;
