use syncsenta_hyperon_bridge::run_syncsenta_policy;

fn main() {
    let queries = [
        ("clear", "!(safeguarding-route clear)"),
        ("self-harm", "!(safeguarding-route self-harm)"),
        ("offline assessment", "!(assessment-finalization-route offline-pending-sync)"),
        ("valid attendance", "!(attendance-action-route valid granted)"),
        ("replayed attendance", "!(attendance-token-route replayed)"),
    ];

    for (label, query) in queries {
        match run_syncsenta_policy(query) {
            Ok(result) => println!("{label}: {result:?}"),
            Err(error) => {
                eprintln!("{label}: {error}");
                std::process::exit(1);
            }
        }
    }
}
