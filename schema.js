const graphql = require("graphql");
const axios = require("axios");
const {
  GraphQLObjectType,
  GraphQLString,
  GraphQLInt,
  GraphQLList,
  GraphQLEnumType,
  GraphQLNonNull,
  GraphQLSchema,
} = graphql;

const Fields = new GraphQLEnumType({
  name: "Fields",
  values: {
    Active: { value: 0 },
    Confirmed: { value: 1 },
    Deceased: { value: 2 },
    Recovered: { value: 3 },
  },
});

const Delta = new GraphQLObjectType({
  name: "Delta",
  fields: () => ({
    confirmed: { type: GraphQLInt },
    deceased: { type: GraphQLInt },
    recovered: { type: GraphQLInt },
  }),
});

const District = new GraphQLObjectType({
  name: "District",
  fields: () => ({
    name: { type: GraphQLString },
    notes: { type: GraphQLString },
    active: { type: GraphQLInt },
    confirmed: { type: GraphQLInt },
    deceased: { type: GraphQLInt },
    recovered: { type: GraphQLInt },
    delta: { type: Delta },
  }),
});

const State = new GraphQLObjectType({
  name: "State",
  fields: () => ({
    name: { type: GraphQLString },
    statecode: { type: GraphQLString },
    districts: {
      type: GraphQLList(District),
      args: { sortDescBy: { type: Fields } },
      resolve(parent, args) {
        parent.districtData.forEach((d) => (d.name = d.district));

        switch (args.sortDescBy) {
          case 0:
            parent.districtData.sort((b, a) => a.active - b.active);
            break;
          case 1:
            parent.districtData.sort((b, a) => a.confirmed - b.confirmed);
            break;
          case 2:
            parent.districtData.sort((b, a) => a.deceased - b.deceased);
            break;
          case 3:
            parent.districtData.sort((b, a) => a.recovered - b.recovered);
            break;
          default:
            break;
        }
        return parent.districtData;
      },
    },
  }),
});

const RootQuery = new GraphQLObjectType({
  name: "RootQuery",
  fields: {
    states: {
      type: GraphQLList(State),
      args: { sortDescBy: { type: Fields } },
      async resolve(parent, args) {
        let states = (
          await axios.get(
            "https://api.covid19india.org/v2/state_district_wise.json",
          )
        ).data;

        states.forEach((s) => (s.name = s.state));

        distTotal = (d, id) => {
          let total = 0;
          switch (id) {
            case 0:
              d.districtData.forEach((dis) => (total += dis.active));
              break;
            case 1:
              d.districtData.forEach((dis) => (total += dis.confirmed));
              break;
            case 2:
              d.districtData.forEach((dis) => (total += dis.deceased));
              break;
            case 3:
              d.districtData.forEach((dis) => (total += dis.recovered));
              break;
            default:
              break;
          }

          return total;
        };

        states.sort(
          (b, a) =>
            distTotal(a, args.sortDescBy) - distTotal(b, args.sortDescBy),
        );

        return states;
      },
    },
    state: {
      type: State,
      args: { statecode: { type: new GraphQLNonNull(GraphQLString) } },
      async resolve(parent, args) {
        let state = (
          await axios.get(
            "https://api.covid19india.org/v2/state_district_wise.json",
          )
        ).data.filter((s) => s.statecode == args.statecode)[0];

        state.name = state.state;

        return state;
      },
    },
  },
});

module.exports = new GraphQLSchema({
  query: RootQuery,
});
