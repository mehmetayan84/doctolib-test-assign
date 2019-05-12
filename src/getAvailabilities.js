import moment from "moment";
import knex from "knexClient";

export default async function getAvailabilities(date, numberOfDays = 7) {
  const availabilities = new Map();
  let week = 0;
  for (let i = 0; i < numberOfDays; ++i) {
    const tmpDate = moment(date).add(i, "days");
    let weekDay = parseInt(tmpDate.format("d"));
    if (weekDay === 6) {
      week++;
      weekDay = -1;
    }
    availabilities.set((week * 7 + weekDay).toString(), {
      date: new Date(tmpDate.format()),
      slots: []
    });
  }

  const events = await knex
      .select("kind", "starts_at", "ends_at", "weekly_recurring")
      .from("events")
      .where(function () {
        this.where("weekly_recurring", true).orWhere("ends_at", ">", +date);
      });

  for (let i = 0; i < events.length; i++) {
    const event = events[i];
    if (event.weekly_recurring) {
      let date = moment(event.starts_at);
      const lastDate = moment(Array.from(availabilities)[availabilities.size - 1][1].date);
      // console.log(lastDate + ' ' + date + ' ' + date.add(7, "days"));
      if (date.add(7, "days").isBefore(lastDate)) {
        const newEvent = {
          kind: event.kind,
          starts_at: moment(event.starts_at).add(7, "days").valueOf(),
          ends_at: moment(event.ends_at).add(7, "days").valueOf(),
          weekly_recurring: 1
        }
        events.push(newEvent);
      }
    }
  }
  events.forEach((item, index, arr) => {
    if(item.kind === 'appointment') {
      arr.push(arr.splice(index, 1)[0]);
    }
  });
  for (const event of events) {
    for (
        let date = moment(event.starts_at);
        date.isBefore(event.ends_at);
        date.add(30, "minutes")
    ) {
      const initialDate = moment(Array.from(availabilities)[0][1].date).valueOf();
      if (date >= initialDate) {
        const day = availabilities.get(Math.floor(moment.duration(date.diff(initialDate)).asDays()).toString());
        if (event.kind === "opening") {
          day.slots.push(date.format("H:mm"));
        } else if (event.kind === 'appointment') {
          day.slots = day.slots.filter(
              slot => slot.indexOf(date.format("H:mm")) === -1
          );
        }
      }
    }
  }
  return Array.from(availabilities.values())
}
