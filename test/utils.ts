import * as Database from "../src/database";

export function createUserDummy(email?: string) {
  var user = {
    email: email || "dummy@mail.com",
    name: "Dummy Jones",
    password: "123123"
  };

  return user;
}

export function clearDatabase(database: Database.IDatabase, done: MochaDone) {
  var promiseUser = database.userModel.remove({});

  Promise.all([promiseUser])
    .then(() => {
      done();
    })
    .catch(error => {
      console.log(error);
    });
}

export function createSeedUserData(database: Database.IDatabase, done: MochaDone) {
  database.userModel
    .create(createUserDummy())
    .then(user => {
      done();
    })
    .catch(error => {
      console.log(error);
    });
}

export async function login(server, config, user) {
  if (!user) {
    user = createUserDummy();
  }

  return server.inject({
    method: "POST",
    url: config.routePrefix + "/users/login",
    payload: { email: user.email, password: user.password }
  });
}
